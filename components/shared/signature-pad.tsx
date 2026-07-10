"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type PointerEvent } from "react";
import { Eraser, Pencil, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SignaturePadHandle {
  /** Returns a transparent-background PNG data URL, or null if nothing was signed. */
  getDataUrl: () => string | null;
  clear: () => void;
}

interface SignaturePadProps {
  className?: string;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 150;

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { className },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedText, setTypedText] = useState("");
  const [hasDrawing, setHasDrawing] = useState(false);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getContext = () => canvasRef.current?.getContext("2d") ?? null;

  const clearCanvas = () => {
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawing(false);
  };

  const pointFromEvent = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const point = pointFromEvent(e);
    const last = lastPointRef.current;
    if (last) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPointRef.current = point;
    setHasDrawing(true);
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  useImperativeHandle(ref, () => ({
    getDataUrl: () => {
      if (mode === "type") {
        const trimmed = typedText.trim();
        if (!trimmed) return null;
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#111827";
        ctx.font = "52px 'Brush Script MT', cursive";
        ctx.textBaseline = "middle";
        ctx.fillText(trimmed, 16, CANVAS_HEIGHT / 2, CANVAS_WIDTH - 32);
        return canvas.toDataURL("image/png");
      }
      if (!hasDrawing || !canvasRef.current) return null;
      return canvasRef.current.toDataURL("image/png");
    },
    clear: () => {
      clearCanvas();
      setTypedText("");
    },
  }));

  return (
    <div className={cn("space-y-3", className)}>
      <ToggleGroup
        type="single"
        variant="outline"
        value={mode}
        onValueChange={(v) => v && setMode(v as "draw" | "type")}
      >
        <ToggleGroupItem value="draw" className="gap-1.5">
          <Pencil className="size-3.5" /> Draw
        </ToggleGroupItem>
        <ToggleGroupItem value="type" className="gap-1.5">
          <Type className="size-3.5" /> Type
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === "draw" ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
            className="w-full touch-none rounded-md border bg-white"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 text-muted-foreground"
            onClick={clearCanvas}
          >
            <Eraser className="size-3.5" /> Clear
          </Button>
          {!hasDrawing && (
            <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-muted-foreground">
              Sign here
            </p>
          )}
        </div>
      ) : (
        <Input
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          placeholder="Type your full name"
          className="h-16 text-2xl italic"
          style={{ fontFamily: "'Brush Script MT', cursive" }}
        />
      )}
    </div>
  );
});
