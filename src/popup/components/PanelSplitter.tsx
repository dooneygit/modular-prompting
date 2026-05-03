import { useRef } from "react";

interface Props {
  onResize: (delta: number) => void;
}

export function PanelSplitter({ onResize }: Props) {
  const startX = useRef<number | null>(null);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    startX.current = e.clientX;

    function onMouseMove(ev: MouseEvent) {
      if (startX.current === null) return;
      const delta = ev.clientX - startX.current;
      startX.current = ev.clientX;
      onResize(delta);
    }

    function onMouseUp() {
      startX.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{ width: 4, cursor: "col-resize", flexShrink: 0 }}
    />
  );
}
