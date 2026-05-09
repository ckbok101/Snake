/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Trophy } from 'lucide-react';

export function UI() {
  const { gameState, playerId, joinGame } = useGameStore();

  const player = playerId && gameState ? gameState.players[playerId] : null;
  const isAlive = player?.state === 'alive';
  const isDead = player?.state === 'dead';

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto relative">
        <div className="flex flex-col gap-2 z-10">
          <h1 className="text-3xl font-black text-green-950 tracking-tighter" style={{ textShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
            NEON.DRAGON
          </h1>
          {isAlive && (
            <div className="text-xl font-mono text-green-900 font-bold">
              Length: {Math.floor(player.score)}
            </div>
          )}
        </div>
        
        {/* Controls Hint */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex gap-2 opacity-90 pointer-events-none hidden sm:flex">
          <div className="flex items-center gap-2 text-xs font-mono text-green-900 bg-black/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-black/10">
            <span className="font-bold bg-black/10 px-1.5 py-0.5 rounded">A</span>
            <span className="font-bold bg-black/10 px-1.5 py-0.5 rounded">D</span>
            <span className="text-green-900/70 uppercase tracking-wider text-[10px]">Turn</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-green-900 bg-black/5 px-3 py-1.5 rounded-full backdrop-blur-sm border border-black/10">
            <span className="font-bold bg-black/10 px-1.5 py-0.5 rounded">SPACE</span>
            <span className="text-green-900/70 uppercase tracking-wider text-[10px]">Boost</span>
          </div>
        </div>

        <button
          onClick={handleOpenNewTab}
          className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 backdrop-blur-md rounded-full text-green-950 text-sm font-bold transition-colors z-10 border border-black/5"
        >
          <ExternalLink size={16} />
          <span>New Tab</span>
        </button>
      </div>

      {/* Leaderboard */}
      {gameState && gameState.leaderboard.length > 0 && (
        <div className="absolute top-20 right-4 w-64 bg-white/40 backdrop-blur-md rounded-2xl p-4 border border-black/5 pointer-events-auto shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-green-950 font-semibold">
            <Trophy size={18} className="text-yellow-600" />
            <h2>LEADERBOARD</h2>
          </div>
          <div className="flex flex-col gap-2">
            {gameState.leaderboard.map((entry, i) => (
              <div key={entry.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-green-900/40 w-4">{i + 1}.</span>
                  <span style={{ color: entry.color }} className="font-bold truncate max-w-[120px] drop-shadow-sm">
                    {entry.name}
                  </span>
                </div>
                <span className="font-mono text-green-950">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menus */}
      <AnimatePresence>
        {(!player || isDead) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-green-50/60 backdrop-blur-sm"
          >
            <div className="bg-white/95 p-8 rounded-3xl border border-black/5 shadow-2xl max-w-md w-full flex flex-col items-center gap-6">
              {isDead && (
                <div className="text-center">
                  <h2 className="text-4xl font-black text-red-600 mb-2">YOU DIED</h2>
                  <p className="text-green-950/60">Final Length: {Math.floor(player.score)}</p>
                </div>
              )}
              
              {!isDead && (
                <div className="text-center">
                  <h2 className="text-3xl font-black text-green-950 mb-2">JOIN ARENA</h2>
                  <p className="text-green-950/60 text-sm">Steer with A/D or Left/Right. Space to boost.</p>
                </div>
              )}
              
              <button
                onClick={joinGame}
                className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors active:scale-95 shadow-md shadow-green-200"
              >
                {isDead ? 'RESPAWN' : 'PLAY'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
