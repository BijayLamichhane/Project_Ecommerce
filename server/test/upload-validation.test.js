import { describe, expect, it } from "vitest";
import { detectImageMime } from "../src/middleware/upload.js";

describe("detectImageMime", () => {
  it("detects JPEG signatures", () => {
    expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("detects PNG signatures", () => {
    expect(
      detectImageMime(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      )
    ).toBe("image/png");
  });

  it("detects GIF signatures", () => {
    expect(detectImageMime(Buffer.from("GIF89a"))).toBe("image/gif");
  });

  it("detects WebP signatures", () => {
    expect(detectImageMime(Buffer.from("RIFFxxxxWEBP"))).toBe("image/webp");
  });

  it("rejects spoofed or unknown content", () => {
    expect(detectImageMime(Buffer.from("not an image"))).toBeNull();
    expect(detectImageMime(Buffer.alloc(0))).toBeNull();
  });
});
