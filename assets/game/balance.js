// Initial balance for playtesting. All gameplay tuning lives here; values are final, not scaled again.
// Units: seconds, military supply, HP/damage, and logical battlefield pixels (one grid = 178).
export const GRID_SPACING=178;
const grid=n=>GRID_SPACING*n;

export const BATTLE={
  startingGold:180,incomePerSecond:4,dismantleRefund:.5,deploymentDelay:.35,
  upgrade:{maxLevel:3,perkLevel:2,costRatio:[.6,.9],hpMultiplier:1.3,damageMultiplier:1.3},
  contactRadius:35,trapRadius:50,hitRadius:40,
  hookStopDistance:45,cleaveRadius:90,cleaveMultiplier:.5,shieldBreakDuration:2.5,interruptRecovery:.6,
  liu:{start:205,speed:34,dashDuration:3,dashMultiplier:3.6,
    pullMultiplier:1.15,pullRange:grid(2),abandonLook:.6},
  enemy:{attackDelay:.3,abilityDelay:4,bossDistance:650,carryMultiplier:.85,slowMultiplier:.5,
    turnDelay:.35,escortDistance:55,rallyDistance:70},
  projectile:{arrowFlight:.22,antiAirStun:.8},
  spawnInterval:1.2
};

// Baseline: an archer needs six hits to kill a soldier; a barricade absorbs fourteen soldier hits.
export const UNIT_STATS={
  zhangfei:{cost:130,hp:360,damage:20,interval:1.5,range:120,skillTime:6,skillRange:220,skillDamage:24,stunDuration:2,guardDuration:2.5,guardDamageMultiplier:.6,castTime:.75},
  guanyu:{cost:150,hp:270,damage:32,interval:1.5,range:165,skillTime:6,skillRange:220,skillDamage:64,castTime:.75},
  zhugeliang:{cost:130,hp:120,damage:12,interval:1.8,range:grid(4),skillTime:7,skillRange:grid(4),skillDamage:28,skillRadius:140,slowDuration:2.5,knockback:grid(1),castTime:.75},
  archer:{cost:60,hp:90,damage:20,interval:1.5,range:grid(4)},
  lancer:{cost:65,hp:180,damage:20,interval:1.25,range:grid(2),braceTime:1.4,braceCooldown:2,braceStun:1},
  shieldbearer:{cost:85,hp:270,damage:12,interval:1.5,range:100,blockCooldown:3,turnRecovery:1.2,swapCooldown:4},
  barricade:{cost:40,hp:240,damage:0,interval:99,range:0},
  log:{cost:60,damage:75,cooldown:10,range:0,duration:2.8,speed:660,hitRadius:40,stunDuration:.4,knockback:60},
  ballista:{cost:110,hp:150,damage:22,interval:2.4,range:grid(4)},
  catapult:{cost:130,hp:170,damage:60,interval:4,range:grid(4),minRange:grid(1),splashRadius:115,flightTime:.85,stunDuration:.5}
};

export const VARIANT_RULES={taunt:{duration:3},hook:{distance:170}};

export const PERKS={
  archer:{range:grid(1)},
  barricade:{thorns:8},
  lancer:{knockback:grid(.5)},
  shieldbearer:{stun:1},
  ballista:{pierceGuard:true},
  catapult:{splash:1.4},
  zhangfei:{heal:.2},
  guanyu:{cleaveTargets:2},
  zhugeliang:{slow:1.2}
};

export const ENEMY_STATS={
  soldier:{hp:120,speed:70,damage:18,interval:1.2,reward:6},
  shield:{hp:240,speed:58,damage:24,interval:1.5,reward:10,guardDuration:3,skillCooldown:8},
  runner:{hp:90,speed:85,damage:12,interval:.9,reward:7,abilityDelay:2.5,windup:.8,skillCooldown:8,dashDuration:1.5,dashMultiplier:1.6},
  drummer:{hp:150,speed:60,damage:12,interval:1.5,reward:9,commandRadius:300,windup:1.5,skillCooldown:9,buffDuration:4,buffMultiplier:1.2},
  airborne:{hp:100,speed:72,damage:16,interval:1.2,reward:8},
  caohong:{hp:480,speed:64,damage:26,interval:1.4,reward:25,commandRadius:300,windup:1.5,skillCooldown:10,bountyDuration:6,bountyReward:10},
  xiahou:{hp:660,speed:62,damage:32,interval:1.5,reward:35,windup:.55,skillCooldown:10,chargeDuration:1.2,chargeMultiplier:2.1,chargeDamage:90,barricadeDamage:130,recovery:3},
  caocao:{hp:1400,speed:52,damage:40,interval:1.4,reward:80}
};

const diluMount={speedMultiplier:10,pickupRadius:24};
export const LEVEL_TUNING={
  changban:{mount:diluMount,phases:{start:{at:0,delay:6,interval:3},bridge:{at:.16,interval:3.5},end:{at:.32,interval:3.5}}},
  river:{startingGoldBonus:40,
    warGong:{at:0,radius:grid(3),knockback:grid(1)},
    caocao:{at:.5,rally:8},
    bite:{caught:.2,miss:.4,close:1,step:2},
    airborneAhead:3,airborneWarning:4,airborneLandSeconds:8,
    gate:{}}
};

export const ECONOMY={
  chestCost:100,starterCoins:0,medalCoins:20,failureStart:.35,failureFraction:.3,
  commanders:{caohong:40,xiahou:60,caocao:100},
  levels:{changban:{win:100,first:120},river:{win:140,first:140}}
};
