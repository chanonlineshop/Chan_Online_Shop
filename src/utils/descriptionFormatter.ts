export interface ParsedDescription {
  summary: string;
  bullets: string[];
  specs: { label: string; value: string }[];
  paragraphs: string[];
}

export function parseProductDescription(rawText: string = ''): ParsedDescription {
  if (!rawText || !rawText.trim()) {
    return {
      summary: 'No description provided for this product.',
      bullets: [],
      specs: [],
      paragraphs: ['No description provided for this product.'],
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const bullets: string[] = [];
  const specs: { label: string; value: string }[] = [];
  const paragraphs: string[] = [];

  for (const line of lines) {
    // Check if line starts with a bullet point
    if (/^[•\-\*\>]\s+/.test(line)) {
      const cleanBullet = line.replace(/^[•\-\*\>]\s+/, '').trim();
      bullets.push(cleanBullet);
      continue;
    }

    // Check if line is a key-value spec like "Battery: 5000mAh" or "Warranty: 1 Year"
    const specMatch = line.match(/^([A-Za-z0-9\s\-_/]{2,25}):\s+(.+)$/);
    if (specMatch && !line.toLowerCase().startsWith('http')) {
      specs.push({
        label: specMatch[1].trim(),
        value: specMatch[2].trim(),
      });
      continue;
    }

    paragraphs.push(line);
  }

  // If there are no explicit bullets, see if paragraph has comma-separated clauses or sentences
  const summary = paragraphs[0] || bullets[0] || rawText;

  return {
    summary,
    bullets,
    specs,
    paragraphs: paragraphs.length > 0 ? paragraphs : [rawText],
  };
}

export const DESCRIPTION_TEMPLATES = [
  {
    name: 'Electronics / Tech',
    text: `High-performance device designed for daily reliability.

Key Features:
• Fast performance with premium chipset
• Long-lasting battery life with quick charge
• Durable build with modern ergonomic finish

Specifications:
• Connectivity: Bluetooth 5.3 & USB-C
• Warranty: 1-Year Official Warranty
• In the Box: Device, Charging Cable, User Manual`,
  },
  {
    name: 'Fashion / Apparel',
    text: `Premium comfort wear crafted from high-grade breathable fabric.

Details & Fit:
• Material: 100% Breathable Combed Cotton
• Fit: Regular Comfort Fit
• Care Instructions: Machine wash cold, tumble dry low
• Origin: Ethically manufactured with certified dyes`,
  },
  {
    name: 'Home & Living',
    text: `Modern living essential that blends seamless functionality with contemporary aesthetics.

Highlights:
• High-grade scratch-resistant material
• Space-saving compact footprint
• Easy maintenance and wipe-clean surface
• Suitable for everyday home and office use`,
  },
  {
    name: 'Beauty & Skincare',
    text: `Dermatologically tested gentle formula suitable for all skin types.

Benefits:
• Deep hydration and daily nourishment
• Lightweight, non-greasy absorption
• Paraben-free and cruelty-free certified
• How to Use: Apply a small amount morning and evening`,
  },
];
