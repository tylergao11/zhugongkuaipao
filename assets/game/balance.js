// Initial balance for playtesting. All gameplay tuning lives here; values are final, not scaled again.
// Units: seconds, military supply, HP/damage, and logical battlefield pixels (one grid = 178).
export const GRID_SPACING=178;
const grid=n=>GRID_SPACING*n;

export const BATTLE={
  startingGold:180,incomePerSecond:4,dismantleRefund:.5,deploymentDelay:.35,heroReadyDelay:2.5,
  redeploySpeed:150,redeploySafeDistance:100,contactRadius:35,trapRadius:50,movingHitRadius:55,hitRadius:40,
  hookStopDistance:45,cleaveRadius:90,cleaveMultiplier:.5,shieldBreakDuration:2.5,interruptRecovery:.6,
  liu:{start:205,speed:34,dashDuration:3,dashMultiplier:2.4},
  guard:{damage:100,stun:5,radius:250,arrivalDelay:.8},
  enemy:{attackDelay:.3,abilityDelay:4,bossDistance:650,carryMultiplier:.85,slowMultiplier:.5,
    turnDelay:.35,escortDistance:55,rallyDistance:70,smokeRevealDistance:80},
  projectile:{arrowFlight:.22,antiAirStun:.8}
};

// Baseline: an archer needs six hits to kill a soldier; a barricade absorbs fourteen soldier hits.
export const UNIT_STATS={
  zhangfei:{cost:130,hp:360,damage:20,interval:1.5,range:120,skillTime:12,skillRange:220,skillDamage:24,stunDuration:2,guardDuration:2.5,guardDamageMultiplier:.6,castTime:.75},
  guanyu:{cost:150,hp:270,damage:32,interval:1.5,range:165,skillTime:12,skillRange:220,skillDamage:64,castTime:.75},
  zhugeliang:{cost:130,hp:120,damage:12,interval:1.8,range:grid(4),skillTime:14,skillRange:grid(4),skillDamage:28,skillRadius:140,slowDuration:2.5,knockback:grid(1),castTime:.75},
  archer:{cost:60,hp:90,damage:20,interval:1.5,range:grid(4)},
  lancer:{cost:65,hp:180,damage:20,interval:1.25,range:grid(2),braceTime:1.4,braceCooldown:2,braceStun:1},
  shieldbearer:{cost:85,hp:270,damage:12,interval:1.5,range:100,blockCooldown:3,turnRecovery:1.2,swapCooldown:4},
  crossbowman:{cost:90,hp:85,damage:16,interval:1.8,range:grid(4),burstCount:2,burstInterval:.2,rootDuration:.6},
  slinger:{cost:80,hp:110,damage:28,interval:2.4,range:grid(4),splashRadius:70,flightTime:.5},
  barricade:{cost:40,hp:240,damage:0,interval:99,range:0,raiseTime:.8},
  log:{cost:60,damage:75,cooldown:10,range:0,duration:2.8,speed:660,hitRadius:40,stunDuration:.4,knockback:60},
  oil:{cost:70,damage:18,cooldown:12,range:0,duration:6,radius:140},
  ballista:{cost:110,hp:150,damage:22,interval:2.4,range:grid(4)},
  catapult:{cost:130,hp:170,damage:60,interval:4,range:grid(4),minRange:grid(1),splashRadius:115,flightTime:.85,stunDuration:.5},
  snare:{cost:25,hp:1,damage:0,range:0,trapDuration:3}
};

export const VARIANT_RULES={
  'line-roar':{skillRange:grid(2)},taunt:{duration:3},hook:{distance:170},spin:{skillRange:130},
  'wind-wall':{duration:5,radius:35,stun:1.5},signal:{duration:4},spread:{range:grid(1.5),targets:3},
  'lance-hook':{distance:120},suppress:{duration:1},'command-break':{stun:.3},
  'scatter-stones':{duration:5,stun:1},'wood-drop':{radius:150,stun:.8},
  'fire-line':{stun:1.5},tow:{distance:130},net:{duration:2.4},rubble:{duration:5},bell:{duration:5}
};

export const ENEMY_STATS={
  soldier:{hp:120,speed:70,damage:18,interval:1.2,reward:6},
  shield:{hp:240,speed:58,damage:24,interval:1.5,reward:10,guardDuration:3,skillCooldown:8},
  runner:{hp:90,speed:85,damage:12,interval:.9,reward:7,abilityDelay:2.5,windup:.8,skillCooldown:8,dashDuration:1.5,dashMultiplier:1.6},
  drummer:{hp:150,speed:60,damage:12,interval:1.5,reward:9,commandRadius:300,windup:1.5,skillCooldown:9,buffDuration:4,buffMultiplier:1.2},
  airborne:{hp:100,speed:72,damage:16,interval:1.2,reward:8},
  caohong:{hp:480,speed:64,damage:26,interval:1.4,reward:25,commandRadius:300,windup:1.5,skillCooldown:10,bountyDuration:6,bountyReward:10},
  xiahou:{hp:660,speed:62,damage:32,interval:1.5,reward:35,windup:1.3,skillCooldown:10,chargeDuration:1.2,chargeMultiplier:2.1,chargeDamage:90,barricadeDamage:130,recovery:1.5}
};

export const TACTIC_STATS={redeploy:{cost:20},lure:{cost:25,radius:grid(3)},smoke:{cost:30,duration:6,radius:grid(1)}};

// Rear-entry waves must launch early enough to reach the route before its ~120 s unopposed finish.
const diluMount={speedMultiplier:10,pickupRadius:24};
export const LEVEL_TUNING={
  changban:{enemyCountMultiplier:2,mount:diluMount,phases:{start:{at:0,delay:6,interval:3},bridge:{at:.16,interval:4},runner:{at:.32,interval:4}}},
  mountain:{mount:{...diluMount,progress:.85},phases:{shield:{at:0,delay:6,interval:3.5},drum:{at:.18,interval:3.5},bounty:{at:.32,interval:3}},
    rockfall:{at:.30,radius:grid(.5),damage:60,stun:1.5,fallTime:.6},decoy:{at:.62,radius:600}},
  river:{enemyCountMultiplier:1.3,startingGoldBonus:200,intro:{progress:.20,talkDuration:2.2,runDuration:1.2,replyDuration:2.2},fireBarrel:{at:.35,radius:grid(1.5),duration:8,damage:24},warGong:{at:.60,radius:grid(3),stun:4},ambush:{triggerRadius:grid(.5)},
    phases:{charge:{at:0,delay:6,interval:3},landing:{at:.44,gap:20,interval:3},air:{at:.60,gap:18,interval:8},last:{at:.73,gap:16,interval:3},siege:{defenseAt:2,interval:1},lastStand:{defenseAt:8,interval:.9}},
    gate:{warning:4,safeDistance:260},escape:{at:.91,wait:10},drops:{warning:4,safeDistance:260}}
};

// No starting coins; the tutorial first-clear bonus funds the first chest.
export const ECONOMY={
  chestCost:100,starterCoins:0,medalCoins:20,failureStart:.35,failureFraction:.3,
  commanders:{caohong:40,xiahou:60},
  levels:{changban:{win:100,first:120},mountain:{win:120,first:120},river:{win:140,first:140}}
};
