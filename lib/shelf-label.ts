export type ShelfParts = {
  sectionNumber: string;
  shelfNumber: string;
  levelNumber: string;
  levelLabel: string;
};

export function parseShelfNumber(value: string): ShelfParts | null {
  const [sectionNumber, shelfNumber, levelNumber] = value
    .normalize("NFKC")
    .trim()
    .split("-")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (!sectionNumber || !shelfNumber || !levelNumber) {
    return null;
  }

  return {
    sectionNumber,
    shelfNumber,
    levelNumber,
    levelLabel: toLevelLabel(levelNumber)
  };
}

export function formatShelfDescription(value: string): string {
  const parts = parseShelfNumber(value);

  if (!parts) {
    return value;
  }

  return `区分 ${parts.sectionNumber} / 棚 ${parts.shelfNumber} / ${parts.levelLabel}`;
}

function toLevelLabel(levelNumber: string): string {
  if (levelNumber === "1") {
    return "下段";
  }

  if (levelNumber === "2") {
    return "上段";
  }

  return `上下 ${levelNumber}`;
}
