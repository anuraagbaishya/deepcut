export interface ListItem {
  rank: number;
  value: string;
  hint?: string;
}

export interface ListSummary {
  _id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
}

export interface FullList extends ListSummary {
  items: ListItem[];
}

export interface Team {
  name: string;
  color: string;
  score: number;
}

export interface RevealedItem {
  rank: number;
  value: string;
  hint?: string;
  teamName: string;
  teamColor: string;
}

export interface GuessResult {
  guess: string;
  matched: boolean;
  rank?: number;
  value?: string;
  points?: number;
  teamName?: string;
}

export interface GameState {
  slug: string;
  teamNames: string[];
  guessesPerTeam: number;
}
