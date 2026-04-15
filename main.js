class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        console.log('MainScene Preload...');
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        
        // --- Player Textures ---
        graphics.clear();
        graphics.fillStyle(0x00ffff, 1);
        graphics.fillCircle(5, 5, 5);
        graphics.generateTexture('player_dot', 10, 10);

        graphics.clear();
        graphics.fillStyle(0x00ffff, 1);
        graphics.fillCircle(15, 15, 15);
        graphics.generateTexture('player_circle', 30, 30);
        
        graphics.clear();
        graphics.fillStyle(0xffff00, 1);
        graphics.fillTriangle(15, 0, 0, 30, 30, 30);
        graphics.generateTexture('player_triangle', 30, 30);
        
        graphics.clear();
        graphics.fillStyle(0xff00ff, 1);
        graphics.fillRect(0, 0, 30, 30);
        graphics.generateTexture('player_square', 30, 30);
        
        // --- Bullet Textures ---
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(5, 5, 5);
        graphics.generateTexture('bullet_tex', 10, 10);

        graphics.clear();
        graphics.fillStyle(0xffa500, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('enemy_bullet_tex', 8, 8);
        
        // --- Enemy Texture ---
        graphics.clear();
        graphics.fillStyle(0xff0000, 1);
        graphics.fillCircle(10, 10, 10);
        graphics.generateTexture('enemy_tex', 20, 20);

        // --- VFX Textures ---
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(2, 2, 2);
        graphics.generateTexture('particle', 4, 4);
    }

    create() {
        console.log('MainScene Create...');
        
        // Hide Loading Screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';

        this.gameState = "menu";
        this.playerState = {
            shape: "dot",
            level: 1,
            kills: 0,
            damage: 10,
            speed: 200,
            health: 100,
            fireRate: 400
        };

        this.gameTime = 0;
        this.arenaSize = 800;
        this.shrinkRate = 0.1;
        
        // Background Grid Effect
        this.grid = this.add.grid(400, 300, 2000, 2000, 40, 40, 0x000000, 0, 0xffffff, 0.05);

        this.arena = this.add.rectangle(400, 300, this.arenaSize, this.arenaSize);
        this.arena.setStrokeStyle(4, 0x00ffff, 0.5);

        // Create player
        this.player = this.physics.add.sprite(400, 300, 'player_dot');
        this.player.body.setCollideWorldBounds(true);
        this.player.setVisible(false);

        // Groups
        this.bullets = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();

        // --- OPTION B: Particle Emitters (Fixed Phaser 3.60 Syntax) ---
        this.deathParticles = this.add.particles('particle', {
            speed: { min: 50, max: 200 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            emitting: false
        });

        this.trailParticles = this.add.particles('particle', {
            speed: 0,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            emitting: false
        });

        this.glowParticles = this.add.particles('particle', {
            speed: { min: -20, max: 20 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.4, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            follow: this.player,
            emitting: false
        });

        // Low Health Vignette
        this.vignette = this.add.rectangle(400, 300, 800, 600, 0xff0000, 0);
        this.vignette.setStrokeStyle(100, 0xff0000, 0);
        this.vignette.setScrollFactor(0);
        this.vignette.setDepth(100);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D');

        this.lastFired = 0;

        // Enemy Spawn Timer
        this.enemyTimer = this.time.addEvent({
            delay: 1500,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true,
            paused: true
        });

        // Collisions
        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.playerHit, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.playerHit, null, this);

        // HUD
        this.hudContainer = this.add.container(20, 20).setVisible(false);
        this.hudBg = this.add.rectangle(0, 0, 220, 100, 0x000000, 0.5).setOrigin(0);
        this.hud = this.add.text(10, 10, "", { font: 'bold 16px Courier New', fill: '#00ffff' });
        this.hudContainer.add([this.hudBg, this.hud]);

        this.healthBarBg = this.add.rectangle(20, 100, 200, 10, 0x333333).setOrigin(0).setVisible(false);
        this.healthBarFill = this.add.rectangle(20, 100, 200, 10, 0x00ff00).setOrigin(0).setVisible(false);
        
        this.helpText = this.add.text(400, 580, 'WASD: MOVE | CLICK: FIRE | EVOLVE TO SURVIVE', { font: 'bold 12px Courier New', fill: '#ffffff44' }).setOrigin(0.5).setVisible(false);

        // Start Menu
        this.setupMenu();
    }

    setupMenu() {
        this.titleText = this.add.text(400, 200, "GEOROYALE", { font: 'bold 80px Courier New', fill: '#00ffff' }).setOrigin(0.5);
        this.titleText.setStroke('#00ffff', 2);
        this.titleText.setShadow(0, 0, '#00ffff', 10, true, true);
        
        this.subtitleText = this.add.text(400, 280, "SHAPE EVOLUTION ARENA", { font: '20px Courier New', fill: '#ffffff' }).setOrigin(0.5);
        
        this.menuButton = this.add.rectangle(400, 400, 300, 60, 0x00ffff, 0.1).setStrokeStyle(2, 0x00ffff);
        this.menuText = this.add.text(400, 400, "INITIALIZE CORE", { font: 'bold 20px Courier New', fill: '#00ffff' }).setOrigin(0.5);
        
        this.menuButton.setInteractive({ useHandCursor: true });
        
        // Menu Hover Effect
        this.menuButton.on('pointerover', () => {
            this.menuButton.setFillStyle(0x00ffff, 0.3);
            this.tweens.add({ targets: this.menuText, scale: 1.1, duration: 100 });
        });
        this.menuButton.on('pointerout', () => {
            this.menuButton.setFillStyle(0x00ffff, 0.1);
            this.tweens.add({ targets: this.menuText, scale: 1, duration: 100 });
        });

        this.menuButton.on("pointerdown", () => {
            this.startGame();
        });

        // Floating Title Effect
        this.tweens.add({
            targets: [this.titleText, this.subtitleText],
            y: '+=10',
            duration: 2000,
            yoyo: true,
            loop: -1,
            ease: 'Sine.easeInOut'
        });
    }

    resetToPlaying() {
        this.gameState = "playing";
        
        // Reset Stats
        this.playerState = {
            shape: "dot",
            level: 1,
            kills: 0,
            damage: 10,
            speed: 200,
            health: 100,
            fireRate: 400
        };
        this.gameTime = 0;
        this.arenaSize = 800;
        
        // Reset World
        this.physics.world.setBounds(400 - this.arenaSize / 2, 300 - this.arenaSize / 2, this.arenaSize, this.arenaSize);
        this.arena.setSize(this.arenaSize, this.arenaSize);
        this.arena.width = this.arenaSize;
        this.arena.height = this.arenaSize;
        
        // Reset Player
        this.player.setPosition(400, 300);
        this.player.setTexture('player_dot');
        this.player.setVisible(true);
        this.player.clearTint();
        
        // Clear Entities
        this.bullets.clear(true, true);
        this.enemies.clear(true, true);
        this.enemyBullets.clear(true, true);
        
        this.lastFired = 0;
        
        // Reset UI
        this.hudContainer.setVisible(true);
        this.healthBarBg.setVisible(true);
        this.healthBarFill.setVisible(true);
        this.helpText.setVisible(true);
        this.vignette.setFillStyle(0xff0000, 0);
        this.vignette.setStrokeStyle(100, 0xff0000, 0);
        
        // Restart Timer
        this.enemyTimer.paused = false;
        this.time.timeScale = 1;
        
        this.cameras.main.flash(800, 0, 255, 255);
        this.cameras.main.shake(200, 0.01);
    }

    startGame() {
        this.gameState = "playing";
        this.player.setVisible(true);
        this.hudContainer.setVisible(true);
        this.healthBarBg.setVisible(true);
        this.healthBarFill.setVisible(true);
        this.helpText.setVisible(true);
        this.enemyTimer.paused = false;
        
        if (this.titleText) this.titleText.destroy();
        if (this.subtitleText) this.subtitleText.destroy();
        if (this.menuButton) this.menuButton.destroy();
        if (this.menuText) this.menuText.destroy();
        
        this.cameras.main.flash(800, 0, 255, 255);
        this.cameras.main.shake(200, 0.01);
    }

    update(time) {
        if (this.gameState !== "playing") return;

        this.gameTime += 0.01;

        // Shrinking Arena
        if (this.arenaSize > 200) {
            this.arenaSize -= this.shrinkRate;
            this.arena.width = this.arenaSize;
            this.arena.height = this.arenaSize;
            this.physics.world.setBounds(400 - this.arenaSize / 2, 300 - this.arenaSize / 2, this.arenaSize, this.arenaSize);
        }

        // Movement
        const speed = this.playerState.speed;
        this.player.body.setVelocity(0);
        if (this.cursors.left.isDown || this.keys.A.isDown) this.player.body.setVelocityX(-speed);
        else if (this.cursors.right.isDown || this.keys.D.isDown) this.player.body.setVelocityX(speed);
        if (this.cursors.up.isDown || this.keys.W.isDown) this.player.body.setVelocityY(-speed);
        else if (this.cursors.down.isDown || this.keys.S.isDown) this.player.body.setVelocityY(speed);

        // Player Particle Trail
        if (this.player.body.velocity.length() > 0) {
            this.trailParticles.emitParticle(1, this.player.x, this.player.y);
        }

        // Shooting
        if (this.input.activePointer.isDown && time > this.lastFired) {
            this.shootBullet();
            this.lastFired = time + this.playerState.fireRate;
        }

        // Enemy Logic
        this.enemies.children.iterate((enemy) => {
            if (!enemy || !enemy.active) return;
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            const enemySpeed = (80 + this.playerState.level * 10) + (this.gameTime * 0.5);
            enemy.body.setVelocity(Math.cos(angle) * enemySpeed, Math.sin(angle) * enemySpeed);

            if (!enemy.lastShot) enemy.lastShot = 0;
            const currentEnemyFireRate = Math.max(1000, 2500 - (this.playerState.level * 200) - (this.gameTime * 2));
            if (time > enemy.lastShot + currentEnemyFireRate) {
                this.enemyShoot(enemy);
                enemy.lastShot = time;
            }
        });

        // Cleanup
        this.bullets.children.each(b => { if (b.active && !Phaser.Geom.Rectangle.Contains(this.physics.world.bounds, b.x, b.y)) b.destroy(); });
        this.enemyBullets.children.each(b => { if (b.active && !Phaser.Geom.Rectangle.Contains(this.physics.world.bounds, b.x, b.y)) b.destroy(); });

        this.updateHUD();
    }

    updateHUD() {
        this.hud.setText(
            `STATUS: ONLINE\n` +
            `CORE: ${this.playerState.shape.toUpperCase()}\n` +
            `LVL: ${this.playerState.level}\n` +
            `EXP: ${this.playerState.kills} KILLS`
        );

        // Animated Health Bar
        const targetWidth = Math.max(0, this.playerState.health * 2);
        this.tweens.add({
            targets: this.healthBarFill,
            width: targetWidth,
            duration: 200,
            ease: 'Power2'
        });
        
        const healthColor = this.playerState.health > 50 ? 0x00ff00 : (this.playerState.health > 25 ? 0xffff00 : 0xff0000);
        this.healthBarFill.setFillStyle(healthColor);

        // Vignette Update
        if (this.playerState.health < 30) {
            const intensity = 0.1 + (Math.sin(this.time.now / 200) * 0.1);
            this.vignette.setFillStyle(0xff0000, intensity);
            this.vignette.setStrokeStyle(100, 0xff0000, intensity * 2);
        } else {
            this.vignette.setFillStyle(0xff0000, 0);
            this.vignette.setStrokeStyle(100, 0xff0000, 0);
        }
    }

    shootBullet() {
        // Subtle Flash & Shake
        this.cameras.main.flash(30, 255, 255, 255, true);
        this.cameras.main.shake(50, 0.002);

        const pointer = this.input.activePointer;
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
        const bullet = this.add.sprite(this.player.x, this.player.y, 'bullet_tex');
        this.physics.add.existing(bullet);
        this.bullets.add(bullet);
        const bulletSpeed = 600 + (this.playerState.level * 50);
        bullet.body.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);
        
        // Bullet Trail
        bullet.trail = this.time.addEvent({
            delay: 20,
            callback: () => {
                if (bullet.active) this.trailParticles.emitParticle(1, bullet.x, bullet.y);
            },
            loop: true
        });
    }

    enemyShoot(enemy) {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const bullet = this.add.sprite(enemy.x, enemy.y, 'enemy_bullet_tex');
        this.physics.add.existing(bullet);
        this.enemyBullets.add(bullet);
        bullet.body.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
        bullet.setTint(0xff0000);
    }

    spawnEnemy() {
        if (this.gameState !== "playing") return;
        const bounds = this.physics.world.bounds;
        const x = Phaser.Math.Between(bounds.x, bounds.right);
        const y = Phaser.Math.Between(bounds.y, bounds.bottom);
        if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 200) return this.spawnEnemy();
        
        const enemy = this.add.sprite(x, y, 'enemy_tex');
        this.physics.add.existing(enemy);
        this.enemies.add(enemy);
        
        // Spawn Effect
        enemy.setScale(0);
        this.tweens.add({ targets: enemy, scale: 1, duration: 300, ease: 'Back.easeOut' });
    }

    hitEnemy(bullet, enemy) {
        if (bullet.trail) bullet.trail.remove();
        bullet.destroy();
        
        // High-end Kill Effect
        this.deathParticles.emitParticle(15, enemy.x, enemy.y);
        this.cameras.main.shake(100, 0.005);
        
        // Kill Popup
        const killText = this.add.text(enemy.x, enemy.y, '+1 KILL', { font: 'bold 16px Courier New', fill: '#00ffff' }).setOrigin(0.5);
        this.tweens.add({
            targets: killText,
            y: enemy.y - 40,
            alpha: 0,
            duration: 600,
            onComplete: () => killText.destroy()
        });

        // Slow motion effect on kill
        this.time.timeScale = 0.5;
        this.time.delayedCall(100, () => { this.time.timeScale = 1; });

        this.playerState.kills += 1;
        this.checkEvolution();
        enemy.destroy();
    }

    checkEvolution() {
        if (this.playerState.kills === 3 && this.playerState.shape === "dot") this.evolvePlayer("circle");
        if (this.playerState.kills === 10 && this.playerState.shape === "circle") this.evolvePlayer("triangle");
        if (this.playerState.kills === 25 && this.playerState.shape === "triangle") this.evolvePlayer("square");
    }

    evolvePlayer(newShape) {
        this.playerState.shape = newShape;
        this.playerState.level += 1;
        
        this.cameras.main.flash(500, 255, 255, 255);
        this.cameras.main.shake(300, 0.01);

        // Persistent Evolution Glow
        this.glowParticles.start(1000); // Emit for 1 second
        this.time.delayedCall(1000, () => this.glowParticles.stop());

        if (newShape === "circle") {
            this.playerState.speed = 230;
            this.playerState.fireRate = 350;
            this.player.setTexture('player_circle');
        } else if (newShape === "triangle") {
            this.playerState.speed = 320;
            this.playerState.fireRate = 250;
            this.player.setTexture('player_triangle');
        } else if (newShape === "square") {
            this.playerState.speed = 180;
            this.playerState.fireRate = 120;
            this.player.setTexture('player_square');
        }
    }

    playerHit(player, target) {
        if (this.gameState !== "playing") return;
        if (target.texture && target.texture.key === 'enemy_bullet_tex') target.destroy();

        this.playerState.health -= 10;
        this.cameras.main.shake(200, 0.01);
        this.cameras.main.flash(100, 255, 0, 0, true);
        
        this.player.setTint(0xffffff);
        this.time.delayedCall(100, () => { this.player.clearTint(); });

        if (this.playerState.health <= 0) this.gameOver();
    }

    gameOver() {
        this.gameState = "gameover";
        this.enemyTimer.paused = true;
        this.player.body.setVelocity(0);
        this.time.timeScale = 0.2; // Extreme slow mo
        
        this.cameras.main.shake(1000, 0.02);
        
        this.time.delayedCall(1000, () => {
            this.time.timeScale = 1;
            
            // --- UI CONTAINER FOR CLEANUP ---
            this.gameOverContainer = this.add.container(0, 0).setDepth(1000);
            
            const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0);
            this.gameOverContainer.add(overlay);

            this.tweens.add({
                targets: overlay,
                fillAlpha: 1,
                duration: 1000,
                onComplete: () => {
                    const title = this.add.text(400, 200, 'ARENA COLLAPSED', { font: 'bold 50px Courier New', fill: '#ff0000' }).setOrigin(0.5);
                    const stats = this.add.text(400, 270, `KILLS SECURED: ${this.playerState.kills}`, { font: '20px Courier New', fill: '#ffffff' }).setOrigin(0.5);
                    
                    // --- RESTART BUTTON ---
                    const restartBtn = this.add.rectangle(400, 380, 300, 60, 0xff0000, 0.1).setStrokeStyle(2, 0xff0000);
                    const restartText = this.add.text(400, 380, 'RESTART SYSTEM', { font: 'bold 20px Courier New', fill: '#ff0000' }).setOrigin(0.5);
                    restartBtn.setInteractive({ useHandCursor: true });
                    
                    restartBtn.on('pointerover', () => {
                        restartBtn.setFillStyle(0xff0000, 0.3);
                        this.tweens.add({ targets: restartText, scale: 1.1, duration: 100 });
                    });
                    restartBtn.on('pointerout', () => {
                        restartBtn.setFillStyle(0xff0000, 0.1);
                        this.tweens.add({ targets: restartText, scale: 1, duration: 100 });
                    });
                    restartBtn.on('pointerdown', () => {
                        this.gameOverContainer.destroy();
                        this.resetToPlaying();
                    });

                    // --- MAIN MENU BUTTON ---
                    const menuBtn = this.add.rectangle(400, 460, 300, 60, 0xffffff, 0.05).setStrokeStyle(2, 0xffffff, 0.5);
                    const menuText = this.add.text(400, 460, 'RETURN TO BASE', { font: 'bold 20px Courier New', fill: '#ffffff' }).setOrigin(0.5);
                    menuBtn.setInteractive({ useHandCursor: true });

                    menuBtn.on('pointerover', () => {
                        menuBtn.setFillStyle(0xffffff, 0.2);
                        this.tweens.add({ targets: menuText, scale: 1.1, duration: 100 });
                    });
                    menuBtn.on('pointerout', () => {
                        menuBtn.setFillStyle(0xffffff, 0.05);
                        this.tweens.add({ targets: menuText, scale: 1, duration: 100 });
                    });
                    menuBtn.on('pointerdown', () => location.reload());

                    this.gameOverContainer.add([title, stats, restartBtn, restartText, menuBtn, menuText]);
                }
            });
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#050b14',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [MainScene]
};

const game = new Phaser.Game(config);
