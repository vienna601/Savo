import React, { useState } from "react";
import "../styles/Chat.css";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Add user message to chat
    const userMessage = {
      text: inputMessage,
      isUser: true,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // call to Gemini API
      const response = await fetch("http://localhost:8000/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
        }),
      });

      const data = await response.json();

      // Add AI response to chat
      const aiMessage = {
        text: data.response, // Adjust based on actual API response structure
        isUser: false,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
      // Add error message to chat
      const errorMessage = {
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
    setInputMessage("");
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${
              message.isUser ? "user-message" : "ai-message"
            }`}
          >
            <div className="message-bubble">{message.text}</div>
          </div>
        ))}
        {isLoading && (
          <div className="message ai-message">
            <div className="message-bubble loading">Thinking...</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-container">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="chat-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
