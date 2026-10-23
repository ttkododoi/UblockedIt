import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

export type Source = { provider: 'local'; url: string; label: string };

export type Game = {
  id: string;
  title: string;
  tagline: string;
  category: string;
  tags: string[];
  rating: number;
  players: number;
  cover: string;
  sources: Source[];
  featured?: boolean;
  hot?: boolean;
  installed?: boolean;
  custom?: boolean;
};

export type Emulator = {
  id: string;
  name: string;
  short: string;
  core: string;
  years: string;
  icon: string;
  blurb: string;
  extensions: string[];
  color: string;
  bios?: boolean;
  heavy?: boolean;
  saveStates?: boolean;
};

export type Runtime = {
  id: string;
  name: string;
  tech: string;
  icon: string;
  color: string;
  blurb: string;
  accept: string;
  how: string;
};

type Catalog = {
  games: Game[];
  categories: string[];
  emulators: Emulator[];
  runtimes: Runtime[];
};

const Ctx = createContext<{ catalog: Catalog | null; loading: boolean; reload: () => void }>({
  catalog: null,
  loading: true,
  reload: () => {},
});

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api
      .get<Catalog>('/api/catalog')
      .then((data) => {
        setCatalog(data);
        setLoading(false);
      })
      .catch(() => {
        setCatalog({ games: [], categories: ['All'], emulators: [], runtimes: [] });
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  return <Ctx.Provider value={{ catalog, loading, reload: load }}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  return useContext(Ctx);
}
