"use client";

import { forwardRef } from "react";

interface ReportDocumentViewerProps {
  html: string;
  zoom: number;
}

export const ReportDocumentViewer = forwardRef<HTMLIFrameElement, ReportDocumentViewerProps>(
  function ReportDocumentViewer({ html, zoom }, ref) {
    return (
      <div className="flex justify-center overflow-auto rounded-xl border bg-muted/40 p-6">
        <div
          style={{
            width: `${(816 * zoom) / 100}px`,
            height: `${(1200 * zoom) / 100}px`,
          }}
          className="shrink-0"
        >
          <iframe
            ref={ref}
            title="Report preview"
            srcDoc={html}
            style={{
              width: "816px",
              height: "1200px",
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top left",
              border: "none",
            }}
            className="rounded-lg bg-white shadow-lg"
          />
        </div>
      </div>
    );
  }
);
