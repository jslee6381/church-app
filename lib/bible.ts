export type BibleBook = {
  book: string;
  testament: "OT" | "NT";
  chapterCount: number;
};

export const BIBLE_BOOKS: BibleBook[] = [
  { book: "Genesis", testament: "OT", chapterCount: 50 },
  { book: "Exodus", testament: "OT", chapterCount: 40 },
  { book: "Leviticus", testament: "OT", chapterCount: 27 },
  { book: "Numbers", testament: "OT", chapterCount: 36 },
  { book: "Deuteronomy", testament: "OT", chapterCount: 34 },
  { book: "Joshua", testament: "OT", chapterCount: 24 },
  { book: "Judges", testament: "OT", chapterCount: 21 },
  { book: "Ruth", testament: "OT", chapterCount: 4 },
  { book: "1 Samuel", testament: "OT", chapterCount: 31 },
  { book: "2 Samuel", testament: "OT", chapterCount: 24 },
  { book: "1 Kings", testament: "OT", chapterCount: 22 },
  { book: "2 Kings", testament: "OT", chapterCount: 25 },
  { book: "1 Chronicles", testament: "OT", chapterCount: 29 },
  { book: "2 Chronicles", testament: "OT", chapterCount: 36 },
  { book: "Ezra", testament: "OT", chapterCount: 10 },
  { book: "Nehemiah", testament: "OT", chapterCount: 13 },
  { book: "Esther", testament: "OT", chapterCount: 10 },
  { book: "Job", testament: "OT", chapterCount: 42 },
  { book: "Psalms", testament: "OT", chapterCount: 150 },
  { book: "Proverbs", testament: "OT", chapterCount: 31 },
  { book: "Ecclesiastes", testament: "OT", chapterCount: 12 },
  { book: "Song of Solomon", testament: "OT", chapterCount: 8 },
  { book: "Isaiah", testament: "OT", chapterCount: 66 },
  { book: "Jeremiah", testament: "OT", chapterCount: 52 },
  { book: "Lamentations", testament: "OT", chapterCount: 5 },
  { book: "Ezekiel", testament: "OT", chapterCount: 48 },
  { book: "Daniel", testament: "OT", chapterCount: 12 },
  { book: "Hosea", testament: "OT", chapterCount: 14 },
  { book: "Joel", testament: "OT", chapterCount: 3 },
  { book: "Amos", testament: "OT", chapterCount: 9 },
  { book: "Obadiah", testament: "OT", chapterCount: 1 },
  { book: "Jonah", testament: "OT", chapterCount: 4 },
  { book: "Micah", testament: "OT", chapterCount: 7 },
  { book: "Nahum", testament: "OT", chapterCount: 3 },
  { book: "Habakkuk", testament: "OT", chapterCount: 3 },
  { book: "Zephaniah", testament: "OT", chapterCount: 3 },
  { book: "Haggai", testament: "OT", chapterCount: 2 },
  { book: "Zechariah", testament: "OT", chapterCount: 14 },
  { book: "Malachi", testament: "OT", chapterCount: 4 },
  { book: "Matthew", testament: "NT", chapterCount: 28 },
  { book: "Mark", testament: "NT", chapterCount: 16 },
  { book: "Luke", testament: "NT", chapterCount: 24 },
  { book: "John", testament: "NT", chapterCount: 21 },
  { book: "Acts", testament: "NT", chapterCount: 28 },
  { book: "Romans", testament: "NT", chapterCount: 16 },
  { book: "1 Corinthians", testament: "NT", chapterCount: 16 },
  { book: "2 Corinthians", testament: "NT", chapterCount: 13 },
  { book: "Galatians", testament: "NT", chapterCount: 6 },
  { book: "Ephesians", testament: "NT", chapterCount: 6 },
  { book: "Philippians", testament: "NT", chapterCount: 4 },
  { book: "Colossians", testament: "NT", chapterCount: 4 },
  { book: "1 Thessalonians", testament: "NT", chapterCount: 5 },
  { book: "2 Thessalonians", testament: "NT", chapterCount: 3 },
  { book: "1 Timothy", testament: "NT", chapterCount: 6 },
  { book: "2 Timothy", testament: "NT", chapterCount: 4 },
  { book: "Titus", testament: "NT", chapterCount: 3 },
  { book: "Philemon", testament: "NT", chapterCount: 1 },
  { book: "Hebrews", testament: "NT", chapterCount: 13 },
  { book: "James", testament: "NT", chapterCount: 5 },
  { book: "1 Peter", testament: "NT", chapterCount: 5 },
  { book: "2 Peter", testament: "NT", chapterCount: 3 },
  { book: "1 John", testament: "NT", chapterCount: 5 },
  { book: "2 John", testament: "NT", chapterCount: 1 },
  { book: "3 John", testament: "NT", chapterCount: 1 },
  { book: "Jude", testament: "NT", chapterCount: 1 },
  { book: "Revelation", testament: "NT", chapterCount: 22 },
];

export function getBibleBook(bookName: string) {
  return BIBLE_BOOKS.find((item) => item.book === bookName) ?? null;
}

export function formatPassageRange(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number,
) {
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${book} ${startChapter}:${startVerse}`;
    }

    return `${book} ${startChapter}:${startVerse}-${endVerse}`;
  }

  return `${book} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
}
