// Echo 悬浮按钮：随身灵核伙伴，随时可聊（GDD §2.6 Echo 无世界实体）
import { useDialogueStore } from "../stores/dialogueStore";

export function EchoButton() {
  const { status, activeNpc, open } = useDialogueStore();
  const isActive = status !== "idle" && activeNpc === "echo";
  return (
    <button
      onClick={() => open("echo")}
      title="和 Echo 说话"
      style={{
        position: "fixed", right: 18, bottom: 180, zIndex: 999,
        width: 52, height: 52, borderRadius: "50%",
        background: isActive ? "#66ddff" : "rgba(20,30,50,0.9)",
        border: "2px solid #66ddff", boxShadow: "0 0 16px #66ddff66",
        color: isActive ? "#0a0f1e" : "#66ddff", fontSize: 22, cursor: "pointer",
        fontFamily: "monospace",
      }}
    >
      ◉
    </button>
  );
}
