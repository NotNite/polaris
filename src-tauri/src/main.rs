#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod connection;

use connection::*;
use tauri::async_runtime::Mutex;

fn main() {
    let state = XMPPState { xmpp_tx: None };
    tauri::Builder::default()
        .manage(WrappedXMPPState(Mutex::new(state)))
        .invoke_handler(tauri::generate_handler![
            connect, send, disconnect, get_secret, set_secret
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
