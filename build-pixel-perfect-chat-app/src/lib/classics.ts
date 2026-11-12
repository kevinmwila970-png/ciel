import type { GutenbergBook } from "./types";

export const CLASSICS: GutenbergBook[] = [
  [1342, "Pride and Prejudice", "Austen, Jane"],
  [84, "Frankenstein", "Shelley, Mary Wollstonecraft"],
  [2701, "Moby-Dick", "Melville, Herman"],
  [11, "Alice's Adventures in Wonderland", "Carroll, Lewis"],
  [345, "Dracula", "Stoker, Bram"],
  [1661, "The Adventures of Sherlock Holmes", "Doyle, Arthur Conan"],
  [1260, "Jane Eyre", "Brontë, Charlotte"],
  [64317, "The Great Gatsby", "Fitzgerald, F. Scott"],
  [98, "A Tale of Two Cities", "Dickens, Charles"],
  [174, "The Picture of Dorian Gray", "Wilde, Oscar"],
  [1727, "The Odyssey", "Homer"],
  [2554, "Crime and Punishment", "Dostoevsky, Fyodor"],
  [5200, "Metamorphosis", "Kafka, Franz"],
  [1232, "The Prince", "Machiavelli, Niccolò"],
  [1497, "The Republic", "Plato"],
  [2680, "Meditations", "Aurelius, Marcus"],
  [76, "Adventures of Huckleberry Finn", "Twain, Mark"],
  [1400, "Great Expectations", "Dickens, Charles"],
  [768, "Wuthering Heights", "Brontë, Emily"],
  [36, "The War of the Worlds", "Wells, H. G."],
].map(([id, title, author]) => ({ id: Number(id), title: String(title), author: String(author), cover: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`, textUrl: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, subjects: ["Classics"] }));
