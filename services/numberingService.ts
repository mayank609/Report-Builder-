type DocCounterType = "report" | "invoice";

export const numberingService = {
  async next(docType: DocCounterType, prefix: string, minimumFloor = 0): Promise<string> {
    const res = await fetch("/api/numbering", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, minimumFloor }),
    });
    if (!res.ok) throw new Error("Failed to generate number");
    const { nextValue } = await res.json();
    return `${prefix}-${String(nextValue).padStart(6, "0")}`;
  },
};
