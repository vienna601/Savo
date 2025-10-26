import React, { useEffect } from "react";

export default function TavusCall() {
  useEffect(() => {
    // Get environment variables from Vite
    const tavusApiKey = import.meta.env.VITE_TAVUS_API_KEY;
    const tavusPersonaId = import.meta.env.VITE_TAVUS_PERSONA_ID;
    const tavusReplicaId = import.meta.env.VITE_TAVUS_REPLICA_ID;
    const tavusConversationUrl = import.meta.env.VITE_TAVUS_CONVERSATION_URL;

    // Create iframe element
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    // Set the content
    iframe.srcdoc = `
      <html>
        <script crossorigin src="https://unpkg.com/@daily-co/daily-js"></script>
        <body>
          <script>
            // Make env variables available
            window.VITE_TAVUS_API_KEY = "${tavusApiKey}";
            window.VITE_TAVUS_PERSONA_ID = "${tavusPersonaId}";
            window.VITE_TAVUS_REPLICA_ID = "${tavusReplicaId}";

            call = window.Daily.createFrame({
              showLeaveButton: true,
              lang: "jp",
              showFullscreenButton: true,
              iframeStyle: {
                position: "fixed",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
              },
              theme: {
                colors: {
                  accent: "#2F80ED",
                  background: "#F8F9FA",
                  baseText: "#1A1A1A",
                }
              }
            });
            call.join({ url: "${tavusConversationUrl}" });
          </script>
        </body>
      </html>
    `;

    // Add iframe to document
    document.body.appendChild(iframe);

    // Cleanup on unmount
    return () => {
      document.body.removeChild(iframe);
    };
  }, []);

  return null;
}
