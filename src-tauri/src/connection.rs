use futures::stream::StreamExt;
use futures_util::{FutureExt, SinkExt};
use keyring::Entry;
use serde::Serialize;
use std::str::FromStr;
use tauri::{
    async_runtime::{spawn, Mutex, Sender},
    Manager,
};
use thiserror::Error;
use tokio_xmpp::{AsyncClient, AsyncConfig, AsyncServerConfig, Event};
use xmpp_parsers::{Element, Jid};

#[derive(Error, Debug, Serialize, Clone)]
pub enum Error {
    #[error("Failed to parse JID")]
    ParseJid,
    #[error("Failed to parse stanza")]
    ParseStanza {
        to_client: bool,
        stanza: Option<String>,
    },
    #[error("Failed to interact with service provider")]
    ServiceProvider,
    #[error("Failed to send message to session")]
    SendMessage,
    #[error("Failed to disconnect")]
    Disconnect,
    #[error("Not connected")]
    NotConnected,
    #[error("Failed to authenticate user")]
    Authentication(String),
    #[error("Unknown error")]
    Unknown(String),
    #[error("Unknown authentication error")]
    UnknownAuth(String),
}

#[derive(Debug)]
pub enum XMPPMessage {
    Send(String),
    Close,
}

pub type XMPPResult<T> = Result<T, Error>;

pub struct XMPPState {
    pub xmpp_tx: Option<Sender<XMPPMessage>>,
}

pub struct WrappedXMPPState(pub Mutex<XMPPState>);

fn element_to_string(element: Element) -> Option<String> {
    let mut writer = Vec::new();
    element.write_to(&mut writer).ok();
    String::from_utf8(writer).ok()
}

fn format_error(error: tokio_xmpp::Error) -> Error {
    match error {
        tokio_xmpp::Error::Disconnected => {
            Error::Authentication("unknown-disconnected".to_string())
        }
        tokio_xmpp::Error::Auth(auth) => match auth {
            tokio_xmpp::AuthError::Fail(fail) => {
                let element: Element = fail.into();
                Error::Authentication(element.name().to_string())
            }
            _ => Error::UnknownAuth(auth.to_string()),
        },
        _ => Error::Unknown(error.to_string()),
    }
}

#[tauri::command]
#[allow(unused_assignments)]
pub async fn connect(
    app: tauri::AppHandle,
    state: tauri::State<'_, WrappedXMPPState>,
    jid: String,
    password: String,
) -> XMPPResult<()> {
    let (tx, mut rx) = tauri::async_runtime::channel::<XMPPMessage>(1);
    let mut state = state.0.lock().await;
    if let Some(old_tx) = &state.xmpp_tx {
        old_tx.send(XMPPMessage::Close).await.ok();
    }
    state.xmpp_tx = Some(tx);

    let jid = Jid::from_str(&jid).map_err(|_| Error::ParseJid)?;
    if jid.clone().node().is_none() {
        return Err(Error::ParseJid);
    }

    let config = AsyncConfig {
        jid,
        password,
        server: AsyncServerConfig::UseSrv,
    };

    spawn(async move {
        let mut client = AsyncClient::new_with_config(config);

        let rx_stream = async_stream::stream! {
          while let Some(item) = rx.recv().await {
            yield item;
          }
        };

        let mut rx_pinned = Box::pin(rx_stream);
        let mut told_to_close = false;

        loop {
            futures_util::select! {
                xmpp_message = client.next().fuse() => {
                    match xmpp_message {
                        Some(Event::Online { bound_jid, .. }) => {
                            app.emit_all("connected", bound_jid.to_string()).ok();
                        },
                        Some(Event::Disconnected(error)) => {
                            if told_to_close {
                                app.emit_all("graceful_disconnected", ()).ok();
                            } else {
                                app.emit_all("disconnected", format_error(error)).ok();
                            }
                            break;
                        },
                        Some(Event::Stanza(stanza)) => {
                            if let Some(string) = element_to_string(stanza) {
                                app.emit_all("stanza", string).ok();
                            } else {
                                println!("Failed to parse stanza");
                                app.emit_all("failed_parse_stanza", Error::ParseStanza {
                                    to_client: true,
                                    stanza: None
                                }).ok();
                            }
                        },
                        _ => {}
                    }
                },
                rx_message = rx_pinned.next().fuse() => {
                    match rx_message {
                        Some(XMPPMessage::Send(stanza)) => {
                            let str = Element::from_str(&stanza);
                            if let Ok(e) = str {
                                client.send_stanza(e).await.ok();
                            } else {
                                app.emit_all("failed_parse_stanza", Error::ParseStanza {
                                    to_client: false,
                                    stanza: Some(stanza)
                                }).ok();
                            }
                        },
                        Some(XMPPMessage::Close) => {
                            told_to_close = true;
                            client.close().await.ok();
                            app.emit_all("disconnected", ()).ok();
                            break;
                        },
                        _ => {}
                    }
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn send(state: tauri::State<'_, WrappedXMPPState>, stanza: String) -> XMPPResult<()> {
    let state = state.0.lock().await;
    if let Some(tx) = &state.xmpp_tx {
        tx.send(XMPPMessage::Send(stanza))
            .await
            .map_err(|_| Error::SendMessage)?;
        Ok(())
    } else {
        Err(Error::NotConnected)
    }
}

#[tauri::command]
pub async fn disconnect(state: tauri::State<'_, WrappedXMPPState>) -> XMPPResult<()> {
    let state = state.0.lock().await;
    if let Some(tx) = &state.xmpp_tx {
        tx.send(XMPPMessage::Close)
            .await
            .map_err(|_| Error::Disconnect)?;
        Ok(())
    } else {
        Err(Error::NotConnected)
    }
}

#[tauri::command]
pub async fn get_secret(jid: String) -> XMPPResult<Option<String>> {
    let entry = Entry::new("polaris", &jid).map_err(|_| Error::ServiceProvider)?;
    Ok(entry.get_password().ok())
}

#[tauri::command]
pub async fn set_secret(jid: String, secret: String) -> XMPPResult<()> {
    let entry = Entry::new("polaris", &jid).map_err(|_| Error::ServiceProvider)?;
    entry
        .set_password(&secret)
        .map_err(|_| Error::ServiceProvider)?;
    Ok(())
}
