// Run-long upgrades the player picks between levels. They stack and reset
// only when a new run starts.
class Relics {
  constructor(pool = CONFIG.relics.pool) {
    this.pool = pool;
    this.owned = {};
  }

  stacks(id) {
    return this.owned[id] ?? 0;
  }

  // Total effect of a relic: its configured value times how many are owned.
  bonus(id) {
    const relic = this.pool.find(r => r.id === id);
    return relic ? relic.value * this.stacks(id) : 0;
  }

  add(id) {
    this.owned[id] = this.stacks(id) + 1;
  }

  has(id) {
    return this.stacks(id) > 0;
  }

  static weight(relic) {
    return CONFIG.relics.rarity[relic.rarity ?? 'common']?.weight ?? 1;
  }

  // A relic is blocked when an owned relic lists it in `conflicts`.
  isBlocked(relic) {
    return this.pool.some(owned => this.has(owned.id) && owned.conflicts?.includes(relic.id));
  }

  // Up to `count` different relics that aren't maxed out or blocked yet,
  // drawn by rarity weight.
  offer(count = CONFIG.relics.choices, random = Math.random) {
    const available = this.pool.filter(r => this.stacks(r.id) < r.maxStacks && !this.isBlocked(r));
    const picked = [];
    while (picked.length < count && available.length > 0) {
      const total = available.reduce((sum, r) => sum + Relics.weight(r), 0);
      let remaining = random() * total;
      let index = available.findIndex(r => (remaining -= Relics.weight(r)) < 0);
      if (index < 0) index = available.length - 1;
      picked.push(...available.splice(index, 1));
    }
    return picked;
  }

  // Owned relics in pool order, for the HUD.
  list() {
    return this.pool
      .filter(r => this.stacks(r.id) > 0 && r.id !== 'spareHeart')
      .map(r => ({ id: r.id, name: r.name, color: r.color, stacks: this.stacks(r.id) }));
  }
}
