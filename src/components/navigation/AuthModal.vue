<template>
    <Teleport to="body">
        <div v-if="isOpen" class="auth-modal-overlay" @click.self="close" ref="overlayRef">
        <!-- HTML5 Interactive Neon Car & Particles Canvas -->
        <canvas ref="canvasRef" class="auth-canvas"></canvas>

        <!-- Dynamic 3D Spring-Physics Jelly Login Card -->
        <div 
            ref="cardRef" 
            class="glass-card auth-modal" 
            :style="cardStyle"
            @mouseenter="handleMouseEnterCard"
            @mousemove="handleMouseMoveCard"
            @mouseleave="handleMouseLeaveCard"
        >
            <header class="auth-modal__header">
                <div class="auth-modal__sparkle animate-pulse">✦</div>
                <h3 class="auth-modal__title">{{ mode === 'login' ? 'Welcome Back' : 'Create Account' }}</h3>
                <p class="auth-modal__subtitle">
                    {{ mode === 'login' 
                        ? 'Sign in to sync your watchlist and history with the cloud.' 
                        : 'Choose a unique username to personalize your experience.' 
                    }}
                </p>
            </header>

            <form @submit.prevent="handleSubmit" class="auth-modal__form">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <div class="input-wrapper">
                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Enter unique username" 
                            v-model="username" 
                            class="form-input" 
                            :disabled="loading" 
                            required 
                            autocomplete="off"
                        />
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <div class="input-wrapper">
                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <input 
                            type="password" 
                            placeholder="Enter password" 
                            v-model="password" 
                            class="form-input" 
                            :disabled="loading" 
                            required
                        />
                    </div>
                </div>

                <!-- Status Messages -->
                <div v-if="error" class="status-msg error-msg animate-fade-in">
                    ⚠️ {{ error }}
                </div>
                <div v-if="success" class="status-msg success-msg animate-fade-in">
                    ✨ {{ success }}
                </div>

                <!-- Submit Button -->
                <button type="submit" class="btn btn-primary btn-submit" :disabled="loading">
                    <div v-if="loading" class="spinner-small"></div>
                    <span>{{ mode === 'login' ? 'Sign In' : 'Sign Up' }}</span>
                </button>
            </form>

            <footer class="auth-modal__footer">
                <span v-if="mode === 'login'">
                    Don't have an account? 
                    <button class="toggle-mode-btn" @click="toggleMode">Sign Up</button>
                </span>
                <span v-else>
                    Already have an account? 
                    <button class="toggle-mode-btn" @click="toggleMode">Sign In</button>
                </span>
            </footer>
        </div>
    </div>
    </Teleport>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { loginUser, registerUser } from '../../lib/auth';
import { useActiveVehicle } from '../../composables/useActiveVehicle';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
    decay: number;
}

interface CardSpring {
    x: number;
    y: number;
    vx: number;
    vy: number;
    tiltX: number;
    tiltY: number;
    vtiltX: number;
    vtiltY: number;
    scale: number;
    vscale: number;
}

export default defineComponent({
    name: 'AuthModal',
    props: {
        isOpen: { type: Boolean, required: true }
    },
    emits: ['close'],
    setup(props, { emit }) {
        const { activeVehicle } = useActiveVehicle();
        const mode = ref<'login' | 'signup'>('login');
        const username = ref('');
        const password = ref('');
        const loading = ref(false);
        const error = ref('');
        const success = ref('');

        // Visual / Animation States
        const isCrashing = ref(false);
        const overlayRef = ref<HTMLElement | null>(null);
        const cardRef = ref<HTMLElement | null>(null);
        const canvasRef = ref<HTMLCanvasElement | null>(null);

        // Spring system for the jelly card wobble
        const spring = ref<CardSpring>({
            x: 0, y: 0, vx: 0, vy: 0,
            tiltX: 0, tiltY: 0, vtiltX: 0, vtiltY: 0,
            scale: 1, vscale: 0
        });

        const targetTiltX = ref(0);
        const targetTiltY = ref(0);
        const targetScale = ref(1);

        // Neon Car States
        const carState = ref<'CRUISING' | 'REVERSING' | 'LAUNCHING' | 'CRASHED'>('CRUISING');
        const carX = ref(-100);
        const carY = ref(0);
        const carSpeed = ref(0);
        const carTimer = ref(0);

        // Particles System
        const particles = ref<Particle[]>([]);

        let animationFrameId = 0;

        // Watch keystrokes to fire exhaust sparks
        watch([username, password], () => {
            if (carState.value === 'CRUISING') {
                spawnParticles(carX.value - 47, carY.value + 8, 5, 'spark');
            }
        });

        // 3D Card Style binding
        const cardStyle = computed(() => {
            return {
                transform: `perspective(1000px) translate3d(${spring.value.x}px, ${spring.value.y}px, 0) rotateX(${spring.value.tiltX}deg) rotateY(${spring.value.tiltY}deg) scale(${spring.value.scale})`,
                willChange: 'transform'
            };
        });

        // Close logic
        const close = () => {
            if (!loading.value) {
                emit('close');
                error.value = '';
                success.value = '';
            }
        };

        const toggleMode = () => {
            mode.value = mode.value === 'login' ? 'signup' : 'login';
            error.value = '';
            success.value = '';
        };

        // Mouse hover interaction for 3D Jelly Tilt
        const handleMouseEnterCard = () => {
            targetScale.value = 1.03;
        };

        const handleMouseMoveCard = (e: MouseEvent) => {
            const card = cardRef.value;
            if (!card) return;

            const rect = card.getBoundingClientRect();
            const cardCenterX = rect.left + rect.width / 2;
            const cardCenterY = rect.top + rect.height / 2;

            const dx = e.clientX - cardCenterX;
            const dy = e.clientY - cardCenterY;

            // Tilt factors (max 12deg tilt)
            targetTiltY.value = (dx / (rect.width / 2)) * 12;
            targetTiltX.value = -(dy / (rect.height / 2)) * 12;
        };

        const handleMouseLeaveCard = () => {
            targetTiltX.value = 0;
            targetTiltY.value = 0;
            targetScale.value = 1.0;
        };

        // Particle Emitter
        const spawnParticles = (x: number, y: number, count: number, type: 'spark' | 'smoke' | 'explosion') => {
            for (let i = 0; i < count; i++) {
                const angle = type === 'explosion' 
                    ? Math.random() * Math.PI * 2 
                    : Math.PI + (Math.random() - 0.5) * 0.8;
                
                const speed = type === 'explosion'
                    ? Math.random() * 14 + 3
                    : type === 'smoke'
                        ? Math.random() * 1.5 + 0.3
                        : Math.random() * 3.5 + 1;

                const maxLife = type === 'explosion'
                    ? Math.random() * 35 + 20
                    : type === 'smoke'
                        ? Math.random() * 50 + 25
                        : Math.random() * 25 + 10;

                const colors = {
                    spark: ['#ff5a1f', '#ff3300', '#ffaa00'],
                    smoke: ['rgba(255,255,255,0.06)', 'rgba(0,240,255,0.05)', 'rgba(255,90,31,0.04)'],
                    explosion: ['#ff5a1f', '#00f0ff', '#e02424', '#ff007f', '#ffff00', '#00ffcc']
                };

                const chosenColors = colors[type];
                const color = chosenColors[Math.floor(Math.random() * chosenColors.length)];

                particles.value.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - (type === 'smoke' ? 0.3 : 0),
                    color,
                    size: type === 'smoke' ? Math.random() * 18 + 12 : Math.random() * 3.5 + 1.5,
                    alpha: 1,
                    life: maxLife,
                    maxLife,
                    decay: 1 / maxLife
                });
            }
        };

        // Draw Cyberpunk Neon Car Profile in 2D Vectors
        const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, _isReversing: boolean, speed: number) => {
            ctx.save();
            ctx.translate(x, y);

            // Glowing light trails if traveling at high velocity
            if (speed > 10) {
                const trailGlow = ctx.createLinearGradient(-75, 0, 0, 0);
                trailGlow.addColorStop(0, 'rgba(255, 90, 31, 0)');
                trailGlow.addColorStop(1, 'rgba(255, 90, 31, 0.3)');
                ctx.fillStyle = trailGlow;
                ctx.fillRect(-90, -10, 90, 20);
            }

            // Draw Neon Body Contour
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff5a1f';
            ctx.strokeStyle = '#ff5a1f';
            ctx.lineWidth = 3.5;

            ctx.beginPath();
            ctx.moveTo(-45, 10);
            ctx.lineTo(-45, 0);
            ctx.lineTo(-30, -5);
            ctx.lineTo(-35, -15);
            ctx.lineTo(-24, -15);
            ctx.lineTo(-19, -5);
            ctx.lineTo(-10, -7);
            ctx.lineTo(-5, -19);
            ctx.lineTo(15, -19);
            ctx.lineTo(24, -5);
            ctx.lineTo(44, -2);
            ctx.lineTo(49, 10);
            ctx.lineTo(35, 10);
            ctx.arc(25, 10, 10, 0, Math.PI, true);
            ctx.lineTo(-15, 10);
            ctx.arc(-25, 10, 10, 0, Math.PI, true);
            ctx.closePath();
            ctx.stroke();

            // Window Glass Outline (Cyan)
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(-5, -16);
            ctx.lineTo(12, -16);
            ctx.lineTo(19, -5);
            ctx.lineTo(-6, -5);
            ctx.closePath();
            ctx.stroke();

            // Wheels
            drawWheel(ctx, -25, 10);
            drawWheel(ctx, 25, 10);

            // Glowing Headlight Beam Conic Gradient
            const headlightGlow = ctx.createRadialGradient(49, 5, 0, 160, 5, 90);
            headlightGlow.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
            headlightGlow.addColorStop(1, 'rgba(0, 240, 255, 0)');
            ctx.fillStyle = headlightGlow;
            ctx.beginPath();
            ctx.moveTo(49, 2);
            ctx.lineTo(210, -30);
            ctx.lineTo(210, 40);
            ctx.closePath();
            ctx.fill();

            // Exhaust Port glowing dot
            ctx.fillStyle = '#ff3300';
            ctx.shadowColor = '#ff3300';
            ctx.beginPath();
            ctx.arc(-47, 8, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        const drawPlane = (ctx: CanvasRenderingContext2D, x: number, y: number, _isReversing: boolean) => {
            ctx.save();
            ctx.translate(x, y);

            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f0ff';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2.2;
            
            ctx.beginPath();
            ctx.moveTo(-25, 0); // Tail exhaust
            ctx.lineTo(-25, -5); // Tail wing lower
            ctx.lineTo(-28, -11); // Tail wing tip
            ctx.lineTo(-18, -11); // Tail wing top
            ctx.lineTo(-14, -3); // Rear body
            ctx.lineTo(-6, -3); // Mid body
            ctx.lineTo(-12, -12); // Main wing joint
            ctx.lineTo(-2, -12); // Main wing tip
            ctx.lineTo(6, -2); // Forward fuselage
            ctx.lineTo(18, -2); // Cockpit canopy start
            ctx.lineTo(28, 3); // Nose cone tip
            ctx.lineTo(16, 5); // Lower nose
            ctx.lineTo(6, 3); // Lower body
            ctx.lineTo(-8, 12); // Lower wing tip
            ctx.lineTo(-14, 12); // Lower wing back
            ctx.lineTo(-14, 3); // Engine intake
            ctx.closePath();
            ctx.stroke();

            // Glowing cockpit bubble (Pink)
            ctx.strokeStyle = '#ff007f';
            ctx.shadowColor = '#ff007f';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(6, -2);
            ctx.quadraticCurveTo(12, -7, 18, -2);
            ctx.stroke();

            // Afterburner jet fire trail (Orange)
            const afterburner = ctx.createLinearGradient(-55, 0, -25, 0);
            afterburner.addColorStop(0, 'rgba(255, 90, 31, 0)');
            afterburner.addColorStop(1, 'rgba(255, 90, 31, 0.85)');
            ctx.fillStyle = afterburner;
            ctx.beginPath();
            ctx.moveTo(-25, -3);
            ctx.lineTo(-50, 0);
            ctx.lineTo(-25, 3);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        };

        const drawBoat = (ctx: CanvasRenderingContext2D, x: number, y: number, _isReversing: boolean) => {
            ctx.save();
            ctx.translate(x, y);

            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffaa00';
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2.2;

            ctx.beginPath();
            ctx.moveTo(-25, 4); // Motor mount
            ctx.lineTo(-25, -4); // Outboard engine cover
            ctx.lineTo(-18, -4); // Rear deck
            ctx.lineTo(-6, -4); // Cockpit rim
            ctx.lineTo(6, -4); // Foredeck
            ctx.lineTo(26, 2); // Bow tip
            ctx.lineTo(18, 7); // Hull chine
            ctx.lineTo(-17, 7); // Transom bottom
            ctx.closePath();
            ctx.stroke();

            // Windshield (Cyan)
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(-6, -4);
            ctx.lineTo(0, -9);
            ctx.lineTo(6, -4);
            ctx.stroke();

            // Propeller shaft
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-25, 2);
            ctx.lineTo(-29, 6);
            ctx.stroke();

            // Water spray trails thrown up behind the boat
            const waterGlow = ctx.createLinearGradient(-45, 7, -25, 7);
            waterGlow.addColorStop(0, 'rgba(0, 240, 255, 0)');
            waterGlow.addColorStop(1, 'rgba(0, 240, 255, 0.6)');
            ctx.fillStyle = waterGlow;
            ctx.beginPath();
            ctx.moveTo(-25, 4);
            ctx.lineTo(-45, 10);
            ctx.lineTo(-20, 7);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        };

        const drawSuperman = (ctx: CanvasRenderingContext2D, x: number, y: number, _isReversing: boolean) => {
            ctx.save();
            ctx.translate(x, y);

            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff007f';
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 2.2;

            // Horizontal flying pose silhouette
            ctx.beginPath();
            ctx.moveTo(12, 0); // Neck
            ctx.lineTo(16, 0); // Head / jaw
            ctx.arc(18, -3, 3, 0.5 * Math.PI, 1.8 * Math.PI, true); // Head contour
            ctx.lineTo(24, -3); // Outstretched arm top
            ctx.lineTo(28, -3); // Outstretched fist
            ctx.lineTo(26, 0); // Fist underside
            ctx.lineTo(15, 3); // Armpit
            ctx.lineTo(10, 5); // Torso front
            ctx.lineTo(3, 4); // Hip
            ctx.lineTo(-8, 7); // Rear leg upper
            ctx.lineTo(-20, 7); // Foot tip
            ctx.lineTo(-18, 4); // Foot heel
            ctx.lineTo(-10, 2); // Rear leg lower
            ctx.lineTo(-17, 1); // Front leg foot tip
            ctx.lineTo(-15, -2); // Heel
            ctx.lineTo(-3, -1); // Hip rear
            ctx.lineTo(3, -2); // Shoulder back
            ctx.closePath();
            ctx.stroke();

            // Cape billowing (Orange/Red)
            ctx.strokeStyle = '#ff5a1f';
            ctx.shadowColor = '#ff5a1f';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(5, -2); // Cape shoulder attach
            ctx.quadraticCurveTo(-10, -14, -26, -7); // Billowing cape top line
            ctx.lineTo(-20, 0); // Cape tail bottom edge
            ctx.quadraticCurveTo(-5, -3, 3, 2); // Cape body attach
            ctx.stroke();

            // Chest emblem fill (Yellow)
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.moveTo(10, 1);
            ctx.lineTo(13, -1);
            ctx.lineTo(9, -3);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        };

        const drawVehicle = (ctx: CanvasRenderingContext2D, x: number, y: number, isReversing: boolean, speed: number) => {
            if (activeVehicle.value === 'plane') {
                drawPlane(ctx, x, y, isReversing);
            } else if (activeVehicle.value === 'boat') {
                drawBoat(ctx, x, y, isReversing);
            } else if (activeVehicle.value === 'superman') {
                drawSuperman(ctx, x, y, isReversing);
            } else {
                drawCar(ctx, x, y, isReversing, speed);
            }
        };

        const drawWheel = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.lineWidth = 2.5;

            // Outer tire contour
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.stroke();

            // Wheel spokes rotating dynamically
            ctx.lineWidth = 1.2;
            const rot = (Date.now() / 140) % (Math.PI * 2);
            ctx.rotate(rot);
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(8, 0);
                ctx.stroke();
                ctx.rotate(Math.PI / 2);
            }
            ctx.restore();
        };

        // Spring dynamic solvers for organic elastic movements
        const updateSpring = () => {
            const TENSION = 0.085;
            const DAMPING = 0.18;

            // 1. Position displacement math (wobbles Card on collision impact)
            const ax = -spring.value.x * TENSION - spring.value.vx * DAMPING;
            spring.value.vx += ax;
            spring.value.x += spring.value.vx;

            const ay = -spring.value.y * TENSION - spring.value.vy * DAMPING;
            spring.value.vy += ay;
            spring.value.y += spring.value.vy;

            // 2. 3D Tilt spring equations (governs hover transitions)
            const atiltX = (targetTiltX.value - spring.value.tiltX) * 0.12 - spring.value.vtiltX * 0.22;
            spring.value.vtiltX += atiltX;
            spring.value.tiltX += spring.value.vtiltX;

            const atiltY = (targetTiltY.value - spring.value.tiltY) * 0.12 - spring.value.vtiltY * 0.22;
            spring.value.vtiltY += atiltY;
            spring.value.tiltY += spring.value.vtiltY;

            // 3. Scale Spring math
            const ascale = (targetScale.value - spring.value.scale) * 0.18 - spring.value.vscale * 0.26;
            spring.value.vscale += ascale;
            spring.value.scale += spring.value.vscale;
        };

        // Main Animation Engine updates
        const updatePhysics = (canvasWidth: number) => {
            updateSpring();

            // Update Particle Life
            for (let i = particles.value.length - 1; i >= 0; i--) {
                const p = particles.value[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                p.alpha = Math.max(0, p.life * p.decay);
                if (p.life <= 0) {
                    particles.value.splice(i, 1);
                }
            }

            // Core State Machine
            const cardEl = cardRef.value;
            const cardWidth = cardEl ? cardEl.offsetWidth : 380;
            const cardLeft = canvasWidth / 2 - cardWidth / 2;
            const collisionPoint = cardLeft - 32;

            carTimer.value++;

            if (carState.value === 'CRUISING') {
                if (carX.value < 120) {
                    carX.value += 4.5;
                } else {
                    // float gently on engine idle
                    carY.value = (canvasRef.value?.height ?? 0) / 2 + Math.sin(carTimer.value * 0.12) * 2;
                }
            } else if (carState.value === 'REVERSING') {
                if (carX.value > 60) {
                    carX.value -= 1.8;
                }
                // vibrate heavily
                carY.value = (canvasRef.value?.height ?? 0) / 2 + (Math.random() - 0.5) * 3;
                
                // Emitting exhausts
                spawnParticles(carX.value - 47, carY.value + 8, 1, 'spark');
                spawnParticles(carX.value - 25, carY.value + 18, 3, 'smoke');

                if (carTimer.value > 25) { // rev for ~0.4s
                    carState.value = 'LAUNCHING';
                    carSpeed.value = 0;
                }
            } else if (carState.value === 'LAUNCHING') {
                carSpeed.value = Math.min(38, carSpeed.value + 3.0);
                carX.value += carSpeed.value;

                spawnParticles(carX.value - 47, carY.value + 8, 1, 'spark');
                spawnParticles(carX.value - 25, carY.value + 18, 2, 'smoke');

                // Hit card boundary
                if (carX.value >= collisionPoint) {
                    carState.value = 'CRASHED';

                    // 1. Kickstart massive card jelly wobble
                    spring.value.vx = 55; // Pushed right
                    spring.value.vtiltY = -34; // Twisted hard

                    // 2. Blast 130 glowing shockwave particles
                    spawnParticles(collisionPoint + 20, carY.value, 130, 'explosion');

                    // 3. Dispatch Supabase actions
                    executeAuthRequest();
                }
            }
        };

        const renderCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
            ctx.clearRect(0, 0, width, height);

            // 1. Render all particles
            for (const p of particles.value) {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.shadowBlur = p.color.includes('rgba') ? 0 : 12;
                ctx.shadowColor = p.color;
                ctx.fillStyle = p.color;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 2. Render theme vehicle profile
            if (carState.value !== 'CRASHED') {
                const isReversing = carState.value === 'REVERSING';
                const speed = carState.value === 'LAUNCHING' ? carSpeed.value : 0;
                drawVehicle(ctx, carX.value, carY.value, isReversing, speed);
            }
        };

        const initAnimation = () => {
            const canvas = canvasRef.value;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const handleResize = () => {
                const overlay = overlayRef.value;
                if (overlay) {
                    canvas.width = overlay.clientWidth;
                    canvas.height = overlay.clientHeight;
                } else {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                }
                carY.value = canvas.height / 2;
            };

            handleResize();
            window.addEventListener('resize', handleResize);

            // Set states
            carState.value = 'CRUISING';
            carX.value = -100; // drive in
            carY.value = canvas.height / 2;
            particles.value = [];

            const animateLoop = () => {
                updatePhysics(canvas.width);
                renderCanvas(ctx, canvas.width, canvas.height);
                animationFrameId = requestAnimationFrame(animateLoop);
            };

            animateLoop();
        };

        const stopAnimation = () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };

        // Form Submit interception -> Trigger Car Hyperdrive
        const handleSubmit = async () => {
            error.value = '';
            success.value = '';

            if (!username.value.trim() || !password.value) {
                error.value = 'Please fill in all fields.';
                return;
            }

            loading.value = true;
            isCrashing.value = true;
            carState.value = 'REVERSING';
            carTimer.value = 0;
        };

        // Actual auth execution after crash impact
        const executeAuthRequest = async () => {
            try {
                if (mode.value === 'signup') {
                    const res = await registerUser(username.value, password.value);
                    if (res.success) {
                        success.value = 'Welcome to moovie! Account registered.';
                        spawnSuccessParticles();
                        setTimeout(() => {
                            close();
                            username.value = '';
                            password.value = '';
                        }, 1500);
                    } else {
                        error.value = res.error || 'Failed to sign up.';
                        triggerFailureFeedback();
                    }
                } else {
                    const res = await loginUser(username.value, password.value);
                    if (res.success) {
                        success.value = 'Successfully logged in!';
                        spawnSuccessParticles();
                        setTimeout(() => {
                            close();
                            username.value = '';
                            password.value = '';
                        }, 1500);
                    } else {
                        error.value = res.error || 'Failed to login.';
                        triggerFailureFeedback();
                    }
                }
            } catch (err) {
                error.value = 'An unexpected error occurred. Please try again.';
                triggerFailureFeedback();
            } finally {
                loading.value = false;
                isCrashing.value = false;
            }
        };

        const triggerFailureFeedback = () => {
            // lateral shake spring reaction
            spring.value.vx = -45;
            spring.value.vtiltY = 20;

            setTimeout(() => {
                carState.value = 'CRUISING';
                carX.value = -120; // drive in again
            }, 700);
        };

        const spawnSuccessParticles = () => {
            const cardEl = cardRef.value;
            if (!cardEl) return;
            const rect = cardEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // 150 gold / cyan success stars floating upwards
            for (let i = 0; i < 150; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 10 + 3;
                particles.value.push({
                    x: centerX,
                    y: centerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.8,
                    color: ['#ffd700', '#ffb300', '#00ffcc', '#34d399'][Math.floor(Math.random() * 4)],
                    size: Math.random() * 4.5 + 2.0,
                    alpha: 1,
                    life: Math.random() * 60 + 35,
                    maxLife: 95,
                    decay: 1 / (Math.random() * 60 + 35)
                });
            }
        };

        // Lifecycle loops
        watch(() => props.isOpen, (newVal) => {
            if (newVal) {
                document.body.style.overflow = 'hidden';
                nextTick(() => {
                    initAnimation();
                });
            } else {
                document.body.style.overflow = '';
                stopAnimation();
            }
        });

        onMounted(() => {
            if (props.isOpen) {
                document.body.style.overflow = 'hidden';
                initAnimation();
            }
        });

        onBeforeUnmount(() => {
            document.body.style.overflow = '';
            stopAnimation();
        });

        return {
            mode,
            username,
            password,
            loading,
            error,
            success,
            close,
            toggleMode,
            handleSubmit,

            // Refs & Visuals
            overlayRef,
            cardRef,
            canvasRef,
            spring,
            cardStyle,
            handleMouseEnterCard,
            handleMouseMoveCard,
            handleMouseLeaveCard
        };
    }
});
</script>

<style lang="scss" scoped>
.auth-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-header) + 100);
    background: rgba(4, 6, 10, 0.86);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--s-4);
    overflow: hidden;
    perspective: 1200px;
}

.auth-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
}

.auth-modal {
    position: relative;
    z-index: 2;
    width: 90%;
    max-width: 380px;
    background: rgba(18, 18, 24, 0.82);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--r-lg);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    padding: var(--s-6);
    color: var(--bone-50);
    transform-style: preserve-3d;
    backface-visibility: hidden;

    &__header {
        text-align: center;
        margin-bottom: var(--s-5);
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    &__sparkle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 90, 31, 0.1);
        border: 1px solid rgba(255, 90, 31, 0.3);
        color: var(--ember);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        margin-bottom: var(--s-3);
    }

    &__title {
        font-family: var(--font-display);
        font-size: var(--fs-xl);
        font-weight: 700;
        letter-spacing: var(--ls-tight);
    }

    &__subtitle {
        font-family: var(--font-ui);
        font-size: var(--fs-xs);
        color: var(--bone-400);
        margin-top: var(--s-1);
        line-height: 1.45;
    }

    &__form {
        display: flex;
        flex-direction: column;
        gap: var(--s-4);
    }

    &__footer {
        margin-top: var(--s-5);
        text-align: center;
        font-family: var(--font-ui);
        font-size: var(--fs-xs);
        color: var(--bone-400);
    }
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
}

.form-label {
    font-family: var(--font-ui);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: var(--ls-wide);
    color: var(--bone-400);
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.input-icon {
    position: absolute;
    left: var(--s-3);
    width: 16px;
    height: 16px;
    color: var(--bone-500);
    pointer-events: none;
}

.form-input {
    width: 100%;
    padding: 11px var(--s-4) 11px var(--s-10);
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--r-sm);
    color: var(--bone-50);
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    transition: border-color var(--dur-fast), box-shadow var(--dur-fast);

    &:focus {
        outline: none;
        border-color: rgba(255, 90, 31, 0.5);
        box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.15);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}

.status-msg {
    padding: var(--s-2) var(--s-3);
    border-radius: var(--r-sm);
    font-family: var(--font-ui);
    font-size: var(--fs-xs);
    font-weight: 500;
    text-align: center;
    line-height: 1.4;
}

.error-msg {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.25);
    color: #f87171;
}

.success-msg {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #34d399;
}

.btn-submit {
    width: 100%;
    background: linear-gradient(135deg, var(--ember) 0%, #ff8a00 100%);
    color: var(--ink-900);
    font-weight: 700;
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    padding: 12px;
    border: none;
    border-radius: var(--r-sm);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    box-shadow: 0 4px 15px rgba(255, 90, 31, 0.25);
    transition: transform var(--dur-fast), box-shadow var(--dur-fast);

    &:hover:not(:disabled) {
        transform: translateY(-1px) scale(1.01);
        box-shadow: 0 6px 20px rgba(255, 90, 31, 0.4);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}

.toggle-mode-btn {
    background: transparent;
    border: none;
    color: var(--ember);
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    margin-left: 2px;

    &:hover {
        text-decoration: underline;
    }
}

.spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(0, 0, 0, 0.15);
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.animate-scale-up {
    animation: scaleUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes scaleUp {
    from { transform: scale(0.92); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.animate-fade-in {
    animation: fadeIn 0.25s ease forwards;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>
