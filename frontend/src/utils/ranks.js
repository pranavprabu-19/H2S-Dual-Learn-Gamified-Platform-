export function getRankDetails(elo) {
  if (elo < 1300) return { title: 'Novice', color: '#a0a0b0' };
  if (elo < 1600) return { title: 'Scholar', color: '#00d2ff' };
  if (elo < 1900) return { title: 'Master', color: '#8a2be2' };
  return { title: 'Grandmaster', color: '#ffd700' };
}
