import renderMessage from "../lib/renderMessage";

export default function ChatThread({ msgs }) {
  if (!msgs || msgs.length === 0) return null;

  return (
    <div className="chat-thread">
      {msgs.map((m, i) => (
        <div
          key={i}
          className={`bubble ${m.role}${m.loading ? " loading" : ""}`}
        >
          {m.image && (
            <img
              src={m.image}
              alt=""
              className="bubble-img"
            />
          )}
          {m.loading ? m.text : renderMessage(m.text)}
        </div>
      ))}
    </div>
  );
}
