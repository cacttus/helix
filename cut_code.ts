
// class Gun extends Object3D {
//   private _bulletTimer: WaitTimer = new WaitTimer(0.2);
//   private _bombTimer: WaitTimer = new WaitTimer(0.2);
//   private _parentShip: Ship = null;
//   private _damage: number = 10;
//   private _name: string = "";
//   private _bulletSpeed: number = 90;

//   get bulletSpeed(): number {
//     return this._bulletSpeed;
//   }
//   set bulletSpeed(x: number) {
//     this._bulletSpeed = x;
//   }
//   get name(): string {
//     return this._name;
//   }
//   set name(x: string) {
//     this._name = x;
//   }
//   get bulletTimer(): WaitTimer {
//     return this._bulletTimer;
//   }
//   get bombTimer(): WaitTimer {
//     return this._bombTimer;
//   }

//   private _mod: Files.Model = null;
//   set mod(m: Files.Model) { this._mod = m; }

//   public constructor(parentShip: Ship, speed: number, damage: number, name: string, mod: Files.Model) {
//     super();
//     this._name = name.toLowerCase();
//     this._parentShip = parentShip;
//     this._mod = mod;
//   }
//   public canFire(): boolean {
//     return this._bulletTimer.ready();
//   }
//   public update(dt: number) {
//     this._bulletTimer.update(dt);
//     this._bombTimer.update(dt);
//   }
//   public fire(n: Vector3, sound: boolean = true) {
//     if (this._bulletTimer.ready()) {
//       let v: THREE.Vector3 = new THREE.Vector3();
//       this.getWorldPosition(v);

//       // let mod: Files.Model = Files.Model.Bullet;
//       // if (this._parentShip instanceof EnemyShip) {
//       //   mod = Files.Model.Big_Bullet;
//       // }
//       let b1: Bullet = null;
//       if (this._mod) {
//         if (this._parentShip instanceof EnemyShip) {
//           b1 = new EnemyBullet(this._parentShip, v, n, this.bulletSpeed, this._damage, this._mod);
//         }
//         else if (this._parentShip instanceof PlayerShip) {
//           b1 = new PlayerBullet(this._parentShip, v, n, this.bulletSpeed, this._damage, this._mod);
//         }
//         if (sound) {
//           g_audio.play(Files.Audio.Shoot2, Utils.getWorldPosition(this));
//         }
//       }
//       // if (this._parentShip instanceof EnemyShip) {
//       //   b1 = new EnemyBullet(this._parentShip, v, n, this.bulletSpeed, this._damage, mod);
//       //   if (sound) g_audio.play(Files.Audio.Shoot, Utils.getWorldPosition(this));
//       // }
//       // else if (this._parentShip instanceof PlayerShip) {
//       //   b1 = new PlayerBullet(this._parentShip, v, n, this.bulletSpeed, this._damage, mod);
//       //   if (sound) g_audio.play(Files.Audio.Shoot2, Utils.getWorldPosition(this));
//       // }
//       this._bulletTimer.reset();
//     }
//   }
//   //Returns a bomb if we succsessfully threw a bomb.
//   public bomb(n: Vector3): Bomb {
//     let b1: Bomb = null;
//     if (this._bombTimer.ready()) {
//       b1 = new Bomb(this._parentShip, n);

//       //shoot from gun1, why not?
//       let v: THREE.Vector3 = new THREE.Vector3();
//       this.getWorldPosition(v);
//       b1.position.copy(v);

//       g_audio.play(Files.Audio.Bomb_Shoot, Utils.getWorldPosition(this));
//       this._bombTimer.reset();
//     }
//     return b1;
//   }
// }
// /**
//  * @class Ship
//  * @brief Spaceship class representing both player and enemy ship.
//  * */
// class Ship extends PhysicsObject {

//   public lastFiredBomb: Bomb = null;

//   protected _damage = 10;

//   protected _maxhealth: number = 100;
//   get maxhealth(): number { return this._maxhealth; }

//   private _guns: Array<Gun> = new Array<Gun>();
//   get Guns(): Array<Gun> { return this._guns; }
//   set Guns(guns: Array<Gun>) { this._guns = guns; }

//   public constructor(sz_m: Files.Model, gun_model: Files.Model, afterload: ModelObjectCallback) {
//     super();

//     this._afterLoadModel = afterload;

//     let that = this;
//     g_models.setModelAsyncCallback(sz_m, function (m: THREE.Mesh) {
//       if (m) {
//         let mclone: THREE.Mesh = Utils.duplicateModel(m);
//         that.setModel(mclone);

//         mclone.traverse(function (ob_gun: any) {
//           if (ob_gun instanceof Object3D) {
//             let n: string = ob_gun.name;
//             if (n.toLowerCase().startsWith('gun') && n.length >= 4) {
//               let id: number = 0;

//               let gwp: Vector3 = new Vector3();
//               ob_gun.getWorldPosition(gwp);

//               let gun: Gun = new Gun(that, 90, that._damage, ob_gun.name, gun_model);
//               gun.position.copy(gwp);
//               if (id >= 0) {
//                 that.add(gun);
//                 that.Guns.push(gun);
//               }
//             }
//           }
//         });
//         if (that._afterLoadModel) {
//           that._afterLoadModel(that, m);
//         }

//       }
//     });
//   }

//   public bulletDamage(b: Bullet) {
//     this.health -= b.Damage;
//     g_audio.play(Files.Audio.Ship_Hit, Utils.getWorldPosition(this));
//     b.destroy();
//     g_particles.createShipHitParticles(b.WorldPosition);
//     this.flash(new Color(1, 0, 0), .15, 1);
//   }
//   public update(dt: number) {
//     super.update(dt);
//     for (let gi: number = 0; gi < this._guns.length; ++gi) {
//       this._guns[gi].update(dt);
//     }


//   }
//   protected setBulletSpeed(s: number) {
//     for (let gi = 0; gi < this.Guns.length; ++gi) {
//       this.Guns[gi].bulletSpeed = s;
//     }
//   }

// }
// class PlayerShip extends Ship {
//   public getId(): GameObjectId { return GameObjectId.PlayerShip; }

//   public object_destroy_dist: number = 350;//This is the distance away from the player that objects get destroyed.  If it's too big we get lag, too shallow and you won't create enemys ships.
//   private _strafeSpeed: number = 12;
//   private _liftSpeed: number = 12;
//   private _pitch: number = 0;
//   private _roll: number = 0;
//   private _maxroll: number = Math.PI * 0.1;
//   private _maxpitch: number = Math.PI * 0.06;
//   public bombs: number = 3;
//   public maxbombs: number = 3;
//   public score: number = 0;
//   public _bombSpeed_lv: Array<number> = [
//     3.0, 2.5, 2.5,
//     2.0, 2.0, 1.6,
//     1.6, 1.6, 0.7,
//     0.7];
//   public bombTimer: WaitTimer = new WaitTimer(this._bombSpeed_lv[0]);
//   public _gunSpeed_lv: Array<number> = [
//     0.3, 0.25, 0.25,
//     0.2, 0.2, 0.15,
//     0.15, 0.15, 0.1,
//     0.1];

//   public ShipLevel: number = 0;

//   public constructor() {
//     super(Files.Model.Player_Ship, Files.Model.Bullet, function (ob: PhysicsObject, m: THREE.Mesh) {
//       //Set level to 1 and set all values.
//       //Only callable after our model has loaded since guns need to be tehre.
//       (ob as PlayerShip).levelUp();

//       if (ob instanceof PlayerShip) {
//         ob.setBulletSpeed(90);
//       }
//     });
//   }
//   public static register() {
//     //Set the collision routine.
//     g_physics.collisions.collide(GameObjectId.PlayerShip, GameObjectId.EnemyBullet, function (me: PhysicsObject, other: EnemyBullet) {
//       me.health -= other.Damage;
//       g_audio.play(Files.Audio.Ship_Hit, Utils.getWorldPosition(me));
//       other.destroy();
//       g_particles.createShipHitParticles(other.WorldPosition);
//       (me as PlayerShip).checkHealth();
//     });
//     g_physics.collisions.collide(GameObjectId.PlayerShip, GameObjectId.EnemyShip, function (me: PhysicsObject, other: EnemyShip) {
//       g_particles.createShipHitParticles(me.position);
//       g_particles.createShipDieParticles(me.position);
//       g_audio.play(Files.Audio.Ship_Hit, Utils.getWorldPosition(me));
//       me.health -= 50;
//       other.destroy();
//       (me as PlayerShip).checkHealth();
//     });
//   }
//   protected checkHealth(): void {
//     if (this.health <= 0) {
//       this.health = 0;
//       g_particles.createShipDieParticles(this.WorldPosition);
//       g_audio.play(Files.Audio.Ship_Explode, Utils.getWorldPosition(this));

//       stopGame();
//     }
//   }
//   public levelUp(): void {
//     this.ShipLevel += 1;
//     let cc: Color = this.getColorForShipLevel(this.ShipLevel);
//     if (!this.setColor(cc, 'MainObject')) {
//       Globals.logError("could not set mesh color for ship");

//     }

//     this._damage = 5 + this.ShipLevel * 5;
//     if (this.ShipLevel === 1) {
//     }
//     else if (this.ShipLevel === 2) {
//     }
//     else if (this.ShipLevel === 3) {
//       this.maxbombs = 4;
//     }
//     else if (this.ShipLevel == 4) {
//     }
//     else if (this.ShipLevel == 5) {
//     }
//     else if (this.ShipLevel == 6) {
//       this.maxbombs = 5;
//     }
//     else if (this.ShipLevel == 7) {
//     }
//     else if (this.ShipLevel == 8) {
//     }
//     else if (this.ShipLevel == 9) {
//       this.maxbombs = 7;
//     }
//     else {
//     }

//     for (let gi: number = 0; gi < this.Guns.length; ++gi) {
//       this.Guns[gi].bulletTimer.interval = this._gunSpeed_lv[this.ShipLevel > 10 ? 9 : this.ShipLevel - 1];
//       this.Guns[gi].bombTimer.interval = this._bombSpeed_lv[this.ShipLevel > 10 ? 9 : this.ShipLevel - 1];
//     }

//     if (this.ShipLevel > 1) {
//       g_audio.play(Files.Audio.LevelUp, Utils.getWorldPosition(this));
//     }

//   }

//   public getColorForShipLevel(level: number): Color {
//     let color: Color = new Color(1, 1, 1);
//     if (level === 1) {
//       color = new Color(0.2, 0.4, 1);
//     }
//     else if (level === 2) {
//       color = new Color(0.2, 1, 0.3);
//     }
//     else if (level === 3) {
//       color = new Color(1, 0.5, 0.2);
//     }
//     else if (level === 4) {
//       color = new Color(0, 0.5, 1.0);
//     }
//     else if (level === 5) {
//       color = new Color(0.7, 0.1, 0.3);
//     }
//     else if (level === 6) {
//       color = new Color(1, 0.0, 0.0);
//     }
//     else if (level === 7) {
//       color = new Color(0.48, 0.4, 1.0);
//     }
//     else if (level === 8) {
//       color = new Color(0.45, 0.45, 0.12);
//     }
//     else if (level === 9) {
//       color = new Color(1, 1, 1);
//     }
//     else if (level === 10) {
//       color = new Color(.1, .1, .2);
//     }
//     return color;
//   }

//   private _nresetclick = 0;
//   public update(dt: number) {
//     if (g_isgameover == false) {
//       this.bombTimer.update(dt);

//       this.moveLeftRight(dt, g_input.left.Axis.x);
//       this.moveUpDown(dt, g_input.left.Axis.y);

//       if (Globals.userIsInVR()) {
//         if (g_input.right.Trigger.pressOrHold()) {
//           this.tryFireGun(this.Guns[1], g_input.right.Position);
//           this.tryFireGun(this.Guns[0], g_input.right.Position, false);
//         }
//         if (g_input.right.A.pressed()) {
//           this.tryFireBomb(this.Guns[1], g_input.right.Position);
//         }
//         if (g_input.left.A.pressed()) {
//           this.tryFireBomb(this.Guns[0], g_input.left.Position);
//         }
//       }
//       else {
//         if (g_input.right.Trigger.pressOrHold() || g_input.left.Trigger.pressOrHold()) {
//           this.tryFireGun(this.Guns[0], g_input.right.Position);
//           this.tryFireGun(this.Guns[1], g_input.right.Position, false);
//         }
//         if (g_input.right.A.pressed() || g_input.left.A.pressed()) {
//           this.tryFireBomb(this.Guns[0], g_input.right.Position);
//         }
//       }



//     }
//     else {
//       if (g_input.right.anyButtonPressed() || g_input.left.anyButtonPressed()) {
//         this._nresetclick++;
//         g_audio.play(Files.Audio.Get_Item, Utils.getWorldPosition(this));
//       }
//       if (this._nresetclick === 3) {
//         this._nresetclick = 0;
//         startGame();
//       }
//     }
//     super.update(dt);

//     this.rotation.x = this._pitch;
//     this.rotation.z = this._roll;
//   }

//   public moveLeftRight(dt: number, xaxis: number) {
//     this.position.x += this._strafeSpeed * xaxis * dt;
//     this._roll = this._maxroll * xaxis * -1;
//   }
//   public moveUpDown(dt: number, yaxis: number) {
//     this.position.y += this._liftSpeed * yaxis * dt;
//     this._pitch = this._maxpitch * yaxis;
//   }
//       this.moveLeftRight(dt, g_input.left.Axis.x);
//       this.moveUpDown(dt, g_input.left.Axis.y);
//   private tryFireGun(g: Gun, target_pos: Vector3, sound: boolean = true): void {
//     if (g.canFire()) {
//       if (Globals.userIsInVR()) {
//         let n = new THREE.Vector3();
//         let cw: Vector3 = new Vector3();
//         g_camera.getWorldPosition(cw);
//         //Down a bit so player doesn't have to lift hands
//         cw.y -= g_userGroup.position.y / 2;
//         n = g_input.right.Position.clone().sub(cw);
//         n.normalize();

//         g.fire(n, sound);
//       }
//       else {
//         let n = new THREE.Vector3();
//         g_camera.getWorldDirection(n);
//         g.fire(n, sound);
//       }
//     }
//   }
//   private tryFireBomb(g: Gun, target_pos: Vector3): void {

//     let n = new THREE.Vector3();
//     g_camera.getWorldDirection(n);

//     if (this.lastFiredBomb) {
//       //Blow up the bomb.
//       this.lastFiredBomb.trigger();
//       this.lastFiredBomb = null;
//     }
//     else {
//       if (this.bombs > 0 && g.canFire()) {
//         this.lastFiredBomb = g.bomb(n);
//         if (this.lastFiredBomb !== null) {
//           this.bombs -= 1;
//         }
//       }
//       else {
//         g_audio.play(Files.Audio.Nope, Utils.getWorldPosition(this));
//       }
//     }

//   }
//   private getBulletTimeForLevel() {
//     if (this.ShipLevel == 1) { }
//   }
// }
// class EnemyShip extends Ship {
//   private _droprate: number = 0;
//   private _fireTimers: Array<Timer>;
//   private _points: number = 0;
//   private _numdrops: number = 0;

//   protected get fireTimers(): Array<Timer> { return this._fireTimers; }
//   protected set fireTimers(x: Array<Timer>) { this._fireTimers = x; }
//   public getId(): GameObjectId { return GameObjectId.EnemyShip; }

//   get Points(): number { return this._points; }

//   public constructor(model: Files.Model, bullet_model: Files.Model, health: number, droprate: number, numdrops: number, firetime: IAFloat, points: number, autoguns: boolean = true, afterload: ModelObjectCallback = null) {
//     super(model, bullet_model, function (ob: PhysicsObject, m: THREE.Mesh) {
//       //Set bullet speed for all guns for enemy ships to be a little slower.
//       if (ob instanceof EnemyShip) {
//         ob.setBulletSpeed(45);
//       }
//       let es = ob as EnemyShip;
//       if (es) {
//         if (autoguns) {
//           es._fireTimers = new Array<Timer>();
//           for (let gi = 0; gi < es.Guns.length; ++gi) {
//             let t: Timer = new Timer(firetime.calc(), function () {
//               if (g_gameState !== GameState.GameOver) {
//                 es.fireGun(es.Guns[gi]);
//                 t.Interval = firetime.calc();
//               }
//             });
//             es._fireTimers.push(t);
//           }
//         }
//       }

//       //Fade-In
//       es.opacity = 0.01;
//       es.OpacityDelta = 0.6;

//       if (afterload) {
//         afterload(ob, m);
//       }
//     });
//     this._points = points;
//     this.health = health;
//     this._numdrops = numdrops;
//     this._droprate = droprate;//% chance of a drop.
//   }
//   public static register() {
//     g_physics.collisions.collide(GameObjectId.EnemyShip, GameObjectId.PlayerBullet, function (me: EnemyShip, other: PlayerBullet) {
//       me.bulletDamage(other);
//       me.checkHealth();
//     });
//     g_physics.collisions.collide(GameObjectId.EnemyShip, GameObjectId.BombExplosion, function (me: EnemyShip, other: BombExplosion) {
//       me.health -= 100;
//       me.checkHealth();
//     });
//     g_physics.collisions.collide(GameObjectId.EnemyShip, GameObjectId.Bomb, function (me: EnemyShip, other: Bomb) {
//       other.trigger();
//     });
//   }
//   public update(dt: number) {
//     super.update(dt);
//     if (this._fireTimers) {
//       for (let i = 0; i < this._fireTimers.length; ++i) {
//         this._fireTimers[i].update(dt);
//       }
//     }
//   }

//   protected checkHealth() {
//     if (this.health <= 0) {
//       this.health = 0;

//       g_particles.createShipDieParticles(this.WorldPosition);
//       g_audio.play(Files.Audio.Ship_Explode, Utils.getWorldPosition(this));

//       //Drop stuff
//       for (let i = 0; i < this._numdrops; ++i) {
//         this.dropItem();
//       }

//       //Incement score
//       g_player.score += this.Points;

//       //Kill it
//       this.destroy();
//     }
//   }
//   private dropItem() {
//     //Item Drops:
//     //If the player is deficient then have a 20% chance to drop levels, else drop supplies.
//     //Otherwise only drop levels, we have all our supplies.
//     let playerDeficient: boolean = g_player.health < g_player.maxhealth || g_player.bombs < g_player.maxbombs;
//     let isLevelItem: boolean = playerDeficient ? (Random.float(0, 1) > 0.8) : true;

//     let drop = (1.0 - this._droprate * 0.01);
//     if (Random.float(0, 1) >= drop) {
//       let item = new Item(isLevelItem);
//       //place item random position around ship, because there might be more than 1 item.
//       item.position.copy(this.position.clone().add(Random.randomNormal().multiplyScalar(3)));
//     }
//   }
//   public fireGun(g: Gun) {
//     let dir: Vector3 = new Vector3();
//     //Point the bullet a ways away from the player for the effect of "trying" to shoot player.
//     let v: Vector3 = g_player.WorldPosition.clone();
//     dir.copy(v.sub(new Vector3(0, 0, Random.float(0, 1) * g_player.Velocity.z * 1.5)));
//     dir.sub(this.WorldPosition);
//     dir.normalize();
//     g.fire(dir);
//   }


// }
// /**
//  * The boss has 3 states.
//  * 1. rotate towards player slowly, & fire slowly
//  * 2. spin around and fire a ton of missiles for 4 seconds.
//  * 3. cooldown.
//  */
// enum BossState { None, Fire, Spin, Cooldown }
// enum BossGun { Small, Med, Big }
// class Boss extends EnemyShip {
//   public getId(): GameObjectId { return GameObjectId.Boss; }

//   private _stateTimer: WaitTimer = new WaitTimer(15);
//   private _eState: BossState = BossState.Fire;
//   private _posSaved: Vector3 = new Vector3();

//   private _gunTimerMap: Map<Timer, Gun> = new Map<Timer, Gun>();

//   public constructor() {
//     super(Files.Model.Boss, null, 2000, 100, 3, new IAFloat(3000, 10000), 100, false, function (ob: PhysicsObject, mod: THREE.Mesh) {
//       //Override the default enemy ship fireGun
//       let es = ob as Boss;

//       es._stateTimer = new WaitTimer(15);
//       es._eState = BossState.Fire;
//       es._posSaved = new Vector3();

//       //Boss Guns
//       es.fireTimers = new Array<Timer>();
//       for (let gi = 0; gi < es.Guns.length; ++gi) {
//         let g: Gun = es.Guns[gi];
//         let type: BossGun = es.gunType(g);

//         let interval: number = -1;

//         //classify the gun
//         if (type === BossGun.Small) {
//           interval = Random.float(1000, 2000);
//           g.mod = Files.Model.Boss_Missile;
//         }
//         else if (type === BossGun.Big) {
//           interval = Random.float(5000, 7000);
//           g.mod = Files.Model.Boss_Bomb_Bullet;
//         }
//         else if (type === BossGun.Med) {
//           interval = Random.float(3000, 7000);
//           g.mod = Files.Model.Boss_Bomb_Plus;
//         }

//         if (interval > 100) {
//           let t: Timer = new Timer(interval, function () {
//             if (g_gameState !== GameState.GameOver) {
//               es.fireGun(es.Guns[gi]);
//             }
//           });
//           es.fireTimers.push(t);
//           es._gunTimerMap.set(t, g);
//         }
//       }

//       //After loading the model, then set the state.
//       es._eState = BossState.Cooldown;
//       es.triggerState();

//     });

//     this.health = 1000;
//     this.DestroyCheck = function (ob: PhysicsObject) {
//       let x = ob.position.z - g_player.position.z;
//       if (x > 20) {
//         let n = 0;
//         n++;
//       }
//       return x > 20;
//     }
//     this.OnDestroy = function (ob: PhysicsObject) {
//       exitBoss();
//     }
//   }
//   public static register() {
//     g_physics.collisions.collide(GameObjectId.Boss, GameObjectId.PlayerBullet, function (me: Boss, other: PlayerBullet) {
//       me.bulletDamage(other);
//       me.checkHealth();
//     });
//     g_physics.collisions.collide(GameObjectId.Boss, GameObjectId.BombExplosion, function (me: Boss, other: BombExplosion) {
//       me.health -= 100;
//       me.checkHealth();
//     });
//   }
//   public update(dt: number) {
//     super.update(dt);
//     this.changeState(dt);
//     this.perform(dt);
//   }
//   public triggerGuns(t: BossGun, start: boolean) {
//     if (this.fireTimers) {
//       for (let i = 0; i < this.fireTimers.length; ++i) {
//         let g: Gun = this._gunTimerMap.get(this.fireTimers[i]);
//         if (g) {
//           if (this.gunType(this.Guns[i]) === t) {
//             let timer: Timer = this.fireTimers[i];
//             if (start) {
//               timer.start();
//             }
//             else {
//               timer.pause();
//             }
//           }
//         }
//       }
//     }

//   }
//   public gunType(g: Gun): BossGun {
//     let i: number = g.name.indexOf('gun');
//     if (i >= 0 && g.name.length >= 6) {
//       let type: string = g.name.substr(i, 3).toLowerCase();
//       if (type === 'smm') {
//         return BossGun.Small;
//       }
//       else if (type === 'big') {
//         return BossGun.Big;
//       }
//       else if (type === 'med') {
//         return BossGun.Med;
//       }
//     }
//     return null;
//   }
//   protected checkHealth() {
//     if (this.health <= 0) {
//       this.health = 0;
//       g_particles.createBossDieParticles(this.WorldPosition);
//       g_audio.play(Files.Audio.Ship_Explode, Utils.getWorldPosition(this));
//       this.destroy();
//       exitBoss();
//     }
//   }

//   private changeState(dt: number) {
//     if (this._stateTimer.update(dt)) {
//       this.triggerState();
//       this._stateTimer.reset();
//     }
//   }
//   private triggerState() {
//     if (this._eState === BossState.Fire) {
//       //Start spinning
//       this._posSaved = new Vector3();
//       this._posSaved.copy(this.position);
//       this._eState = BossState.Spin;
//       this._stateTimer.interval = 7;//spin 7s
//       this.triggerGuns(BossGun.Big, false);
//       this.triggerGuns(BossGun.Med, false);
//       this.triggerGuns(BossGun.Small, true);
//     }
//     else if (this._eState === BossState.Spin) {
//       //Cooldown / Pause
//       this._eState = BossState.Cooldown;
//       this._stateTimer.interval = 12;//cooldown 12s
//       this.triggerGuns(BossGun.Big, false);
//       this.triggerGuns(BossGun.Med, false);
//       this.triggerGuns(BossGun.Small, false);
//     }
//     else if (this._eState === BossState.Cooldown) {
//       //Start Firing the big guns Again
//       this._eState = BossState.Fire;
//       if (this._posSaved) {
//         this.position.copy(this._posSaved);
//       }

//       this.scale.set(1, 1, 1);
//       this._stateTimer.interval = 12; // fire 12s
//       this.triggerGuns(BossGun.Big, true);
//       this.triggerGuns(BossGun.Med, false);
//       this.triggerGuns(BossGun.Small, false);
//     }
//     else {
//       Globals.logError("Undefined boss state. " + this._eState);
//     }
//   }

//   private _rz: number = 0;
//   private _rotNormal: Vector3 = new Vector3();

//   private perform(dt: number) {
//     const revspeed = Math.PI * 0.9;
//     const turnspeed = Math.PI * 1.19;

//     if (this._eState === BossState.Fire) {
//       //rotate towards player slowly.
//       let want_dir: Vector3 = g_player.WorldPosition.clone().sub(this.WorldPosition.clone()).normalize();
//       let this_dir: Vector3 = new Vector3();
//       this.getWorldDirection(this_dir);

//       let rot = Math.acos(want_dir.dot(this_dir));
//       this._rotNormal = this_dir.clone().cross(want_dir.clone()).normalize();

//       this._rz += Math.min(rot * dt, turnspeed); //this._rz + turnspeed * dt * (rot < 0 ? -1 : 1);
//       this.rotateOnAxis(this._rotNormal, this._rz);
//     }
//     else if (this._eState === BossState.Spin) {
//       //Rev up
//       this._rz = Math.min(this._rz + revspeed * dt, Math.PI * 3);
//       this.rotateOnAxis(this._rotNormal, this._rz);
//     }
//     else if (this._eState === BossState.Cooldown) {
//       if (this._rz > 0) {
//         //Wind Down
//         this._rz = Math.max(this._rz - revspeed * dt, 0);
//         this.rotateOnAxis(this._rotNormal, this._rz);
//       }
//       else {
//         //Shake in place, squish a litte.
//         this.position.copy(this._posSaved);
//         this.position.add(Random.randomNormal().setZ(this._posSaved.z).multiplyScalar(0.078));
//         let squish: number = 0.983;
//         this.scale.set(Random.float(squish, 1.03), Random.float(squish, 1.03), Random.float(squish, 1.03));
//       }
//     }
//   }
// }
// class Projectile extends PhysicsObject {
//   private _speed: number = 40;//.4;
//   public Damage: number = 10;
//   public constructor(spd: number, direction: Vector3, model: Files.Model, afterLoad: ModelObjectCallback) {
//     super();

//     this._afterLoadModel = afterLoad;

//     let that = this;
//     g_models.setModelAsyncCallback(model, function (b: THREE.Mesh) {
//       if (b != null) {
//         let b2 = Utils.duplicateModel(b);
//         that.setModel(b2);

//         //that.model.material = b.material.clone();

//         that.lookAt(that.position.clone().add(direction));

//         if (that._afterLoadModel) {
//           that._afterLoadModel(that, b);
//         }
//       }
//       else {
//         Globals.logError("Could not find model" + model + " while loading " + model);
//       }
//     });

//     // this.Collide = function () { }//Force object to collide
//     this._speed = spd;
//     this.Velocity.copy(direction.clone().multiplyScalar(this._speed));
//   }
// }

// class Item extends Projectile {
//   public getId(): GameObjectId { return GameObjectId.Item; }

//   private _isLevelItem = false;
//   public constructor(isLevelItem: boolean) {
//     super(0, new Vector3(0, 0, -1), Files.Model.Item, function (object: PhysicsObject, model: THREE.Mesh) {
//       object.health = 6;
//     });
//     this.RotationDelta.y = Math.PI * 1.0093;
//     this._isLevelItem = isLevelItem;
//   }
//   public static register() {
//     g_physics.collisions.collide(GameObjectId.Item, GameObjectId.PlayerBullet, function (me: Item, other: PlayerBullet) {
//       me.health -= 1;
//       g_particles.createItemParticles(me.WorldPosition);
//       me.flash(new Color(.1, .1, .9), .1, 1);
//       other.destroy();

//       me.checkHealth();
//     });
//     g_physics.collisions.collide(GameObjectId.Item, GameObjectId.BombExplosion, function (me: Item, other: BombExplosion) {
//       me.health -= 999;
//       g_particles.createItemParticles(me.WorldPosition);
//       me.checkHealth();
//     });
//   }
//   protected checkHealth() {
//     if (this.health <= 0) {
//       this.health = 0;
//       this.giveItem();
//     }
//   }
//   private giveItem() {
//     let playership: PlayerShip = g_player;

//     if (this._isLevelItem) {
//       g_player.levelUp();
//     }
//     else {
//       g_audio.play(Files.Audio.Get_Item, Utils.getWorldPosition(this));
//       //Health/bombs
//       //Give player powerup based on what's missing
//       if (playership.bombs === playership.maxbombs) {
//         playership.health = Math.min(playership.health + 10, playership.maxhealth);
//       }
//       else if (playership.health === playership.maxhealth) {
//         playership.bombs = Math.min(playership.bombs + 1, playership.maxbombs);
//       }
//       else {
//         let r = Random.float(0, 1);
//         if (r > 0.8) {
//           playership.health = Math.min(playership.health + 10, playership.maxhealth);
//         }
//         else {
//           playership.bombs = Math.min(playership.bombs + 1, playership.maxbombs);
//         }
//       }
//     }
//     this.destroy();
//   }
// }
// class Bullet extends Projectile {
//   public Firer: Ship = null;
//   public constructor(firer: Ship, position: Vector3, direction: Vector3, spd: number, damage: number, mod: Files.Model) {
//     super(spd, direction, mod, function (that: PhysicsObject, m: THREE.Mesh) {
//       let c: Color = null;
//       if (firer instanceof PlayerShip) {
//         c = g_player.getColorForShipLevel(g_player.ShipLevel);;
//         that.color = c.clone();
//         g_particles.createBlasterParticlels(position, c);
//       }
//       else {
//         // c = new Color(0.1, 0.99193, 0.16134);
//       }

//       //  that.opacity = 0.6;
//       that.position.copy(position);
//     });
//     let that = this;

//     this.Firer = firer;
//     this.Damage = damage;

//     //Make these guys rotate.
//     if (mod === Files.Model.Boss_Bomb_Plus || mod === Files.Model.Spacejunk_Bullet) {
//       this.RotationDelta.y = Math.PI * 0.25;
//       this.RotationDelta.z = Math.PI * 0.25;
//     }
//     else if (mod === Files.Model.Triple_Bullet) {
//       // this.RotationDelta.z = Math.PI * 0.570;
//     }
//     else if (mod === Files.Model.Boss_Bomb_Bullet) {
//       this.RotationDelta.z = Math.PI * 0.870;
//     }
//     else if (mod === Files.Model.Boss_Missile) {
//       this.RotationDelta.z = Math.PI * 1.170;
//     }

//   }
// }
// class EnemyBullet extends Bullet {
//   public getId(): GameObjectId { return GameObjectId.EnemyBullet; }

//   public Firer: Ship = null;
//   public constructor(firer: Ship, position: Vector3, direction: Vector3, spd: number, damage: number, mod: Files.Model) {
//     super(firer, position, direction, spd, damage, mod);
//   }
// }
// class PlayerBullet extends Bullet {
//   public getId(): GameObjectId { return GameObjectId.PlayerBullet; }

//   public Firer: Ship = null;
//   public constructor(firer: Ship, position: Vector3, direction: Vector3, spd: number, damage: number, mod: Files.Model) {
//     super(firer, position, direction, spd, damage, mod);
//   }
// }
// class Bomb extends Projectile {
//   public getId(): GameObjectId { return GameObjectId.Bomb; }
//   private _creator: Ship = null;

//   public constructor(creator: Ship, direction: Vector3) {
//     super(55, direction, Files.Model.Bomb, function (that: PhysicsObject, m: THREE.Mesh) {
//       that.opacity = 0.6;
//     });
//     this.RotationDelta.x = Math.PI;
//     this.rotation.z = Math.PI;
//     this.OnDestroy = function (ob: PhysicsObject) {
//       g_audio.play(Files.Audio.Bomb, Utils.getWorldPosition(ob));
//       let exp: BombExplosion = new BombExplosion(ob.position);
//       if (creator !== null) {
//         creator.lastFiredBomb = null;
//       }
//     }
//   }
//   public trigger() {
//     this.destroy();
//   }
//   public update(dt: number) {
//     super.update(dt);
//   }
// }
// class BombExplosion extends Projectile {
//   public getId(): GameObjectId { return GameObjectId.BombExplosion; }

//   private _dietimer: WaitTimer = new WaitTimer(1.1);

//   public constructor(dposition: Vector3) {
//     super(0, new Vector3(0, 1, 0), Files.Model.Bomb_Explosion, function () { });
//     this.position.copy(dposition);
//   }
//   public update(dt: number) {
//     super.update(dt);
//     this._dietimer.update(dt);

//     let scale: number = 150;

//     this.scale.x = 0.01 + this._dietimer.time01 * scale;
//     this.scale.y = 0.01 + this._dietimer.time01 * scale;
//     this.scale.z = 0.01 + this._dietimer.time01 * scale;
//     // this.rotation.y = this._dietimer.time01 * (Math.PI * 4.9378);
//     this.opacity = 1 - this._dietimer.time01;

//     if (this._dietimer.ready()) {
//       this.destroy();
//     }
//   }
// }

// class Starfield extends THREE.Object3D {
//   // private _starMesh: THREE.Mesh = null;
//   //Stars relative to player.
//   private _starScale: IAFloat = new IAFloat(0.2, 2);
//   private _starbox_dist_z = 900;
//   private _starBox: IAVec3 = new IAVec3(new Vector3(-900, -900, -900), new THREE.Vector3(900, 900, 600));
//   //Area around player we don't want to make stars
//   private _nogo: THREE.Box3 = new THREE.Box3(new Vector3(-200, -200, -200), new Vector3(200, 200, 200));
//   private _maxStars: number = 300;
//   private _stars: Array<THREE.Mesh> = new Array<THREE.Mesh>();
//   get Stars(): Array<THREE.Mesh> { return this._stars; }
//   public constructor() {               //rtop rbottom height rsegments hsegments openended
//     super();

//     //Make a bunch of stars.
//     for (let i = 0; i < this._maxStars; ++i) {
//       this.tryMakeStar(true);
//     }
//   }
//   public update(dt: number) {
//     let w: Vector3 = g_player.WorldPosition;
//     //Check for dead stars.
//     for (let iStar = this._stars.length - 1; iStar >= 0; iStar--) {
//       let star: THREE.Mesh = this._stars[iStar];
//       this._stars[iStar].position.z += dt * 90;
//       if (star.position.z - w.z >= 60) {
//         this._stars.splice(iStar, 1);
//         g_world.Scene.remove(star);
//       }
//     }

//     //Make new stars
//     if (this._stars.length < this._maxStars) {
//       let num = this._maxStars - this._stars.length;
//       for (let iStar = 0; iStar < num; ++iStar) {
//         this.tryMakeStar(false);
//       }
//     }

//   }
//   private tryMakeStar(z: boolean) {
//     let star: THREE.Mesh = null;
//     let pos: Vector3 = new Vector3();

//     //Try to make a star.
//     // Do not make stars too close to player (the nogo box)
//     //try 1000 times, else, just quit, we'll try again next frame.
//     //not precise but.. meh, they're decoration.
//     let player_pos: Vector3 = g_player.WorldPosition.clone();
//     for (let iTry = 0; iTry < 255; ++iTry) {
//       pos = this._starBox.calc();
//       // if (z == false) {
//       //This is causing all stars to 'line up'
//       //   //If z is false, place the star at the edge of the player's view, which is negative
//       //   pos.z = this._starBox.Min.z;
//       // }
//       if (this._nogo.containsPoint(pos)) {
//         continue;
//       }
//       else {
//         pos.add(player_pos);
//         star = this.makeStar(pos);
//         break;
//       }
//     }
//     if (star) {
//       this._stars.push(star);
//       g_world.Scene.add(star);
//     }
//   }
//   private makeStar(pos: Vector3): THREE.Mesh {
//     let star: THREE.Mesh = null;
//     var geo = new THREE.BoxBufferGeometry(1, 1, 1);
//     var mat = new THREE.MeshBasicMaterial({
//       transparent: false,
//       side: THREE.FrontSide,
//       color: 0xFFFFFF,
//     });

//     star = new THREE.Mesh(geo, mat);
//     star.position.copy(pos);
//     let s: number = this._starScale.calc();

//     let d = Math.pow(Utils.clampScalar(pos.clone().sub(g_player.WorldPosition).length() / 100, 0, 1), 2);
//     let warp = Random.float(0, 20);

//     star.scale.set(s, s, s + warp);
//     let c: THREE.Color = new THREE.Color();
//     let r: number = Random.float(0, 1);
//     if (r > 0.9) { c.r = 158 / 255; c.g = 231 / 255; c.b = 254 / 255; }//light blue
//     else if (r > 0.4) { c.r = 254 / 255; c.g = 255 / 255; c.b = 240 / 255; }//yellow
//     else if (r > 0.3) { c.r = 123 / 255; c.g = 165 / 255; c.b = 234 / 255; }
//     else if (r > 0.2) { c.r = 48 / 255; c.g = 48 / 255; c.b = 235 / 255; }//blu
//     else if (r > 0.1) { c.r = 234 / 255; c.g = 156 / 255; c.b = 250 / 255; }//pinkish
//     else if (r >= 0.0) { c.r = 252 / 255; c.g = 203 / 255; c.b = 112 / 255; }//orangish
//     (star.material as THREE.MeshBasicMaterial).color.set(c);
//     (star.material as THREE.MeshBasicMaterial).transparent = true;
//     (star.material as THREE.MeshBasicMaterial).opacity = 0.6;//0.7*d;//Random.float(0.2,0.7);

//     return star;
//   }

// }







  // public constructor(atlas: Atlas) {
  //   this._tileMap = new Map<TiledSpriteId, Sprite25D>();
  // //  let that = this;

  //   // this.addTile(function () {
  //   //   let player = new Character(atlas, "Player", TiledSpriteId.Player, TileLayerID.Objects);
  //   //   that.addCharacterAnimation(player, atlas,
  //   //     [[3, 1], [4, 1], [3, 1], [5, 1]],//left
  //   //     [[3, 1], [4, 1], [3, 1], [5, 1]],//right
  //   //     [[6, 1], [7, 1], [6, 1], [8, 1]],//up
  //   //     [[0, 1], [1, 1], [0, 1], [2, 1]]//down
  //   //   );

  //   //   player.face(Direction4Way.Down);

  //   //   player.IsCellTile = false; // This must be set for cell tiles to get populated.
  //   //   player.calcQuadVerts();

  //   //   return player;
  //   // });

  //   // //Testing grass..
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "Grass_Base", TiledSpriteId.Grass_Base);
  //   //   tile.Animation.addTileFrame(new ivec2(1, 0), atlas);
  //   //   tile.Animation.addTileFrame(new ivec2(2, 0), atlas);
  //   //   tile.Animation.addTileFrame(new ivec2(3, 0), atlas);
  //   //   tile.Animation.addTileFrame(new ivec2(4, 0), atlas);
  //   //   tile.Animation.addTileFrame(new ivec2(5, 0), atlas);

  //   //   tile.Tiling = Tiling.Random;
  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "sand_base", TiledSpriteId.sand_base);
  //   //   tile.Animation.addTileFrame(new ivec2(6, 0), atlas);
  //   //   tile.Animation.addTileFrame(new ivec2(7, 0), atlas);
  //   //   tile.Animation.addTileFrame(new ivec2(8, 0), atlas);

  //   //   tile.Tiling = Tiling.Random;
  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   return tile;
  //   // });

  //   // //9,0
  //   // this.addTile(function () {
  //   //   let props = [
  //   //     new SpriteTileInfo(new ivec2(0, 0), TileLayerID.Foreground, CollisionHandling.None), // Tree Top
  //   //     new SpriteTileInfo(new ivec2(1, 0), TileLayerID.Foreground, CollisionHandling.None),
  //   //     new SpriteTileInfo(new ivec2(2, 0), TileLayerID.Objects, CollisionHandling.Layer), //Bush
  //   //     new SpriteTileInfo(new ivec2(0, 1), TileLayerID.Objects, CollisionHandling.Layer),
  //   //     new SpriteTileInfo(new ivec2(1, 1), TileLayerID.Objects, CollisionHandling.Layer),
  //   //     new SpriteTileInfo(new ivec2(2, 1), TileLayerID.Objects, CollisionHandling.Layer), // Bush
  //   //   ]

  //   //   let tile = new Sprite25D(atlas, "Tree", TiledSpriteId.Tree);
  //   //   let off_x = 9;
  //   //   let off_y = 0;
  //   //   for (let j = 0; j < 3; ++j) {
  //   //     for (let i = 0; i < 3; ++i) {
  //   //       tile.Animation.addTileFrame(new ivec2(off_x + i, off_y + j), atlas, new ivec2(1, 1), props);
  //   //     }
  //   //   }
  //   //   tile.Tiling = Tiling.FoliageTiling;
  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   tile.CollisionHandling = CollisionHandling.Layer;
  //   //   tile.Gesture = HandGesture.Poke;

  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let props = [
  //   //     new SpriteTileInfo(new ivec2(0, 0), TileLayerID.Objects, CollisionHandling.Layer), // Tree Top
  //   //     new SpriteTileInfo(new ivec2(1, 0), TileLayerID.Objects, CollisionHandling.Layer),
  //   //     new SpriteTileInfo(new ivec2(2, 0), TileLayerID.Objects, CollisionHandling.Layer), //Bush
  //   //     new SpriteTileInfo(new ivec2(3, 0), TileLayerID.Objects, CollisionHandling.Layer), //Bush
  //   //     new SpriteTileInfo(new ivec2(0, 1), TileLayerID.Objects, CollisionHandling.Layer), //Bush
  //   //     new SpriteTileInfo(new ivec2(1, 1), TileLayerID.Objects, CollisionHandling.Layer),
  //   //     new SpriteTileInfo(new ivec2(2, 1), TileLayerID.Objects, CollisionHandling.Layer),
  //   //     new SpriteTileInfo(new ivec2(3, 1), TileLayerID.Objects, CollisionHandling.Layer), // Bush
  //   //   ]

  //   //   let tile = new Sprite25D(atlas, "Fence", TiledSpriteId.Fence);
  //   //   let off_x = 0;
  //   //   let off_y = 3;
  //   //   for (let j = 0; j < 3; ++j) {
  //   //     for (let i = 0; i < 5; ++i) {
  //   //       tile.Animation.addTileFrame(new ivec2(off_x + i, off_y + j), atlas, new ivec2(1, 1), props);
  //   //     }
  //   //   }
  //   //   tile.Tiling = Tiling.FenceBorderRules;
  //   //   tile.IsCellTile = true;
  //   //   tile.CollisionHandling = CollisionHandling.Layer;
  //   //   tile.Gesture = HandGesture.Poke;

  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "House", TiledSpriteId.House);
  //   //   let off_x = 12;
  //   //   let off_y = 0;
  //   //   for (let j = 0; j < 3; ++j) {
  //   //     for (let i = 0; i < 3; ++i) {
  //   //       tile.Animation.addTileFrame(new ivec2(off_x + i, off_y + j), atlas);
  //   //     }
  //   //   }
  //   //   tile.Tiling = Tiling.Set3x3Block;
  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   tile.CollisionHandling = CollisionHandling.Layer;
  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "Ocean_Water", TiledSpriteId.Ocean_Water);
  //   //   let off_x = 5;
  //   //   let off_y = 5;

  //   //   //add an animated tileframe
  //   //   tile.Animation.addTileFrame(new ivec2(off_x + 0, off_y + 0), atlas, new ivec2(1, 1), null, 2.4);
  //   //   tile.Animation.addTileFrame(new ivec2(off_x + 1, off_y + 0), atlas, new ivec2(1, 1), null, 2.1);
  //   //   tile.Animation.addTileFrame(new ivec2(off_x + 2, off_y + 0), atlas, new ivec2(1, 1), null, 2.0);

  //   //   tile.Tiling = Tiling.None;

  //   //   //Tiled animation for static tile.  Set TilingAnimated to true and play the animation.
  //   //   tile.TilingAnimated = true;
  //   //   tile.Animation.play(Animation25D.c_strDefaultTileAnimation);

  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   tile.CollisionHandling = CollisionHandling.Layer;

  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "Pond_Water", TiledSpriteId.Pond_Water);
  //   //   let off_x = 8;
  //   //   let off_y = 5;

  //   //   //add an animated tileframe
  //   //   tile.Animation.addTileFrame(new ivec2(off_x + 0, off_y + 0), atlas, new ivec2(1, 1), null, 3.4);
  //   //   tile.Animation.addTileFrame(new ivec2(off_x + 1, off_y + 0), atlas, new ivec2(1, 1), null, 3.1);

  //   //   tile.Tiling = Tiling.None;

  //   //   //Tiled animation for static tile.  Set TilingAnimated to true and play the animation.
  //   //   tile.TilingAnimated = true;
  //   //   tile.Animation.play(Animation25D.c_strDefaultTileAnimation);

  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   tile.CollisionHandling = CollisionHandling.Layer;

  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "Rock", TiledSpriteId.Rock);
  //   //   tile.Animation.addTileFrame(new ivec2(9, 3), atlas);
  //   //   tile.Tiling = Tiling.None;
  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   tile.CollisionHandling = CollisionHandling.Layer;
  //   //   tile.Gesture = HandGesture.Grab;
  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "Hole", TiledSpriteId.Hole);
  //   //   tile.Animation.addTileFrame(new ivec2(10, 3), atlas);
  //   //   tile.Tiling = Tiling.None;
  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   tile.CollisionHandling = CollisionHandling.Layer;
  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "Monster_Grass", TiledSpriteId.Monster_Grass);
  //   //   tile.Animation.addTileFrame(new ivec2(11, 3), atlas);
  //   //   tile.Animation.addTileFrame(new ivec2(12, 3), atlas);
  //   //   tile.Tiling = Tiling.None;
  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   tile.CollisionHandling = CollisionHandling.Layer;
  //   //   tile.Gesture = HandGesture.Poke;


  //   //   // tile.PreCollisionFunction = function (this_block: TileBlock) {
  //   //   //   this.Layer = TileLayer.Objects;
  //   //   //   this_block.FrameIndex = toInt(0); // reset
  //   //   // }
  //   //   // tile.CollisionFunction = function (this_block: TileBlock, thisObj: Phyobj25D, other: Phyobj25D) {
  //   //   //   //Move the grass into the foreground and change its sprite
  //   //   //   if (this_block) {
  //   //   //     this_block.Layer = TileLayer.Foreground;
  //   //   //     this_block.FrameIndex = toInt(1); // reset
  //   //   //   }
  //   //   // }
  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "Hard_Border", TiledSpriteId.Hard_Border);

  //   //   that.addFrameGrid(11, 7, 4, 6, tile, atlas);

  //   //   tile.Tiling = Tiling.HardBorderRules;
  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   tile.CollisionHandling = CollisionHandling.Layer;
  //   //   return tile;
  //   //   return tile;
  //   // });
  //   // this.addTile(function () {
  //   //   let tile = new Sprite25D(atlas, "dock", TiledSpriteId.dock);

  //   //   that.addFrameGrid(13, 3, 2, 1, tile, atlas);

  //   //   tile.Tiling = Tiling.DockRules;
  //   //   tile.IsCellTile = true; // This must be set for cell tiles to get populated.
  //   //   tile.CollisionHandling = CollisionHandling.None;
  //   //   return tile;
  //   // });

  // }




    // private addFrameGrid(xoff: number, yoff: number, width: number, height: number, sprite: Sprite25D, atlas: Atlas) {

  //   let off_x = xoff;
  //   let off_y = yoff;
  //   for (let j = 0; j < height; ++j) {
  //     for (let i = 0; i < width; ++i) {
  //       sprite.Animation.addTileFrame(new ivec2(off_x + i, off_y + j), atlas);
  //     }
  //   }

  // }
  // public getTile(id: TiledSpriteId): SpriteFrameDefinition {
  //   return this._sprites.get(id);
  // }
  // private addTile(x: MakeTileFn) {
  //   let tile = x();
  //   this._sprites.set(tile.HelixSpriteId, tile);
  // }

  -
    //Removing specific character animation for generic character animation.
    // //Apply character animation.
    // if (!def.default_character_animation || def.default_character_animation === true) {
    //   // let ret: Array<Array<Array<number>>> = JSON.parse(JSON.stringify(def.animation));
    //   if (ret) {
    //     this.addCharacterAnimation(ret as Character, atlas,
    //       [[3, 1], [4, 1], [3, 1], [5, 1]],
    //       [[3, 1], [4, 1], [3, 1], [5, 1]],
    //       [[6, 1], [7, 1], [6, 1], [8, 1]],
    //       [[0, 1], [1, 1], [0, 1], [2, 1]]
    //     );
    //   }
    //   else {
    //     Globals.logError("Sprite animation was not defined correctly.");
    //   }
    // }
    // else {
    //   Globals.logError("Unsupported animation without char");
    // }


    
// enum ImageGradient { Base, Blue, Red, Green, Yellow, }
// enum TimeOfDayEnum { Dawn, Day, Dusk, Night };
// class TimeOfDay {
//   //holds the time of day and image colors representative of it
//   public time: TimeOfDayEnum = TimeOfDayEnum.Day;
//   public color: ImageGradient = ImageGradient.Green;
//   public gradientLocation: ivec2 = new ivec2(0, 0);
//   public image: ImageData = null; // This is set asynchronously
//   public interpolation_duration: number = 1;
//   public constructor(dtime: TimeOfDayEnum, dcolor: ImageGradient, dlocation: ivec2, dinterp_duration: number) {
//     this.time = dtime;
//     this.color = dcolor;
//     this.gradientLocation = dlocation.clone();
//     this.interpolation_duration = dinterp_duration;
//   }
// }
// class Environment {
//   //Handles time and the changing of the image colors due to changes in the time.
//   public WorldTime_Seconds: number = (5.9) * 60 * 60; /*12=noon*/ // World time in seconds = 24 * 60 * 60 hours [0,86400] 12 = noon
//   public WorldSpeed: number = 120; //Testing -- 60 for 1 hour = 1 minute.
//   public readonly c_WorldTimeMax = 24 * 60 * 60; // 86400;

//   private _world: WorldView25D = null;
//   private _times: Array<TimeOfDay> = new Array<TimeOfDay>();

//   public get WorldTime_Hours(): number { return this.WorldTime_Seconds / 60 / 60; }

//   private _bInterpolatingTimeOfDay: boolean = false;
//   private _timeOfDayInterpolation: number = 0; //[0,1] color interpolation
//   private _timeOfDayInterpolation0: TimeOfDay;
//   private _timeOfDayInterpolation1: TimeOfDay;

//   public constructor(world: WorldView25D) {
//     this._world = world;

//     // this._times = new Array<TimeOfDay>(
//     //   new TimeOfDay(TimeOfDayEnum.Dawn, ImageGradient.Yellow, new ivec2(4, 1), 5),
//     //   new TimeOfDay(TimeOfDayEnum.Day, ImageGradient.Green, new ivec2(1, 1), 5),
//     //   new TimeOfDay(TimeOfDayEnum.Dusk, ImageGradient.Red, new ivec2(3, 1), 5),
//     //   new TimeOfDay(TimeOfDayEnum.Night, ImageGradient.Blue, new ivec2(2, 1), 5),
//     // );

//     // let baseImageData = ImageUtils.getImageDataFromTexture(this._world.SpriteSheetMaterial.map);
//     // let id2  = ImageUtils.scaleImageData(baseImageData, 4);
//     // ImageUtils.swapMaterialImage(this._world.SpriteSheetMaterial, id2);

//     // ImageUtils.computeImageGradients(baseImageData, this._times, TimeOfDayEnum.Day).then((resolve: boolean) => {
//     //   if (Globals.isDebug()) {

//     //     for (let t of this._times) {
//     //       ImageUtils.debug_drawImageToCanvas(t.image);
//     //     }
//     //   }

//     //   Globals.logInfo("Setting initial time of day.");
//     //   //Set initial time of day
//     //   let tod: TimeOfDay = this.getTimeOfDay();
//     //   ImageUtils.swapMaterialImage(this._world.SpriteSheetMaterial, tod.image);

//     // }, (reject: any) => { });
//   }
//   private getTimeOfDay(): TimeOfDay {
//     if (this.WorldTime_Hours > (12 + 7)) {
//       return this._times[TimeOfDayEnum.Night];
//     }
//     else if (this.WorldTime_Hours > (12 + 6)) {
//       return this._times[TimeOfDayEnum.Dusk];
//     }
//     else if (this.WorldTime_Hours > (7)) {
//       return this._times[TimeOfDayEnum.Day];
//     }
//     else if (this.WorldTime_Hours > (6)) {
//       return this._times[TimeOfDayEnum.Dawn];
//     }
//     return this._times[TimeOfDayEnum.Night];//from 0 to 6am
//   }

//   public update(dt: number) {
//     // let lastTimeOfDay = this.getTimeOfDay();

//     // this.WorldTime_Seconds = (this.WorldTime_Seconds + dt * this.WorldSpeed) % this.c_WorldTimeMax;

//     // let currentTimeOfDay = this.getTimeOfDay();

//     // if (lastTimeOfDay !== currentTimeOfDay) {
//     //   //Transition the image.
//     //   this._bInterpolatingTimeOfDay = true;
//     //   this._timeOfDayInterpolation = 0;
//     //   this._timeOfDayInterpolation0 = lastTimeOfDay;
//     //   this._timeOfDayInterpolation1 = currentTimeOfDay;
//     // }

//     // if (this._bInterpolatingTimeOfDay) {
//     //   if (this._timeOfDayInterpolation0.image && this._timeOfDayInterpolation1.image) {
//     //     let steps = 20;
//     //     let step_value = this._timeOfDayInterpolation1.interpolation_duration / steps;

//     //     let cur_step_value = Math.floor(this._timeOfDayInterpolation / step_value);

//     //     this._timeOfDayInterpolation = Utils.clampScalar(this._timeOfDayInterpolation + dt, 0, this._timeOfDayInterpolation1.interpolation_duration);

//     //     //So, since this is slow, in order to prevent lag, we'll divide this into discrete steps.

//     //     let next_step_value = Math.floor(this._timeOfDayInterpolation / step_value);

//     //     //If we have incremented one step, or we are on the last interpolation.
//     //     if (cur_step_value !== next_step_value || (this._timeOfDayInterpolation >= this._timeOfDayInterpolation1.interpolation_duration - 0.0001)) {

//     //       let interp_value_01 = this._timeOfDayInterpolation / this._timeOfDayInterpolation1.interpolation_duration;

//     //       let newImage = ImageUtils.interpolateImages(this._timeOfDayInterpolation0.image, this._timeOfDayInterpolation1.image, interp_value_01);
//     //       ImageUtils.swapMaterialImage(this._world.SpriteSheetMaterial, newImage);

//     //       if (this._timeOfDayInterpolation >= this._timeOfDayInterpolation1.interpolation_duration - 0.0001) {
//     //         this._bInterpolatingTimeOfDay = false;

//     //       }
//     //     }

//     //   }//if images not null

//     // }//If interpolating

//   }
// }



