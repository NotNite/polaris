<script lang="ts">
  import { goto } from "$app/navigation";
  import { currentConnection } from "$lib/connection";
  import "../app.css"; // Import Tailwind

  $: if ($currentConnection == null) {
    console.log("Redirecting from index to login");
    goto("/login");
  } else {
    console.log("Redirecting from index to app");
    goto("/app");
  }
</script>

<span>One moment...</span>
