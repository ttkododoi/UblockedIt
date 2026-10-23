import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Games } from './pages/Games';
import { GameDetail } from './pages/GameDetail';
import { Emulators } from './pages/Emulators';
import { EmulatorPlay } from './pages/EmulatorPlay';
import { Labs } from './pages/Labs';
import { ApkRunner } from './pages/ApkRunner';
import { Community } from './pages/Community';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Account } from './pages/Account';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/games" element={<Games />} />
        <Route path="/game/:id" element={<GameDetail />} />
        <Route path="/emulators" element={<Emulators />} />
        <Route path="/emulators/:id" element={<EmulatorPlay />} />
        <Route path="/labs" element={<Labs />} />
        <Route path="/apk" element={<ApkRunner />} />
        <Route path="/community" element={<Community />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
