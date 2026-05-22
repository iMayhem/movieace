<template>
    <div class="scroll-car-container" :class="{ 'is-active': isScrolled }">
        <!-- Interactive HTML5 Scroll Canvas -->
        <canvas ref="canvasRef" class="scroll-car-canvas"></canvas>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import { useActiveVehicle } from '../../composables/useActiveVehicle';

interface Spark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    alpha: number;
    life: number;
    decay: number;
}

export default defineComponent({
    name: 'ScrollCar',
    setup() {
        const canvasRef = ref<HTMLCanvasElement | null>(null);
        const isScrolled = ref(false);
        const { activeVehicle } = useActiveVehicle();

        // Scroll States
        const scrollPercent = ref(0);
        const scrollSpeed = ref(0);
        const scrollDirection = ref<'right' | 'left'>('right');

        // Physics States
        const carX = ref(0);
        const carVx = ref(0);
        const carY = ref(36);
        const sparks = ref<Spark[]>([]);

        let animationFrameId = 0;
        let lastScrollY = 0;
        let scrollTimeout = 0;

        // Scroll listener to update targets
        const handleScroll = () => {
            const currentScroll = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

            if (maxScroll > 0) {
                scrollPercent.value = currentScroll / maxScroll;
            } else {
                scrollPercent.value = 0;
            }

            // show container only after scrolling a bit
            isScrolled.value = currentScroll > 40;

            const delta = currentScroll - lastScrollY;
            if (Math.abs(delta) > 0.5) {
                // Boost speed based on scrolling pace
                scrollSpeed.value = Math.min(22, Math.abs(delta) * 0.8);
                
                if (delta > 0) {
                    scrollDirection.value = 'right';
                } else {
                    scrollDirection.value = 'left';
                }
            }

            lastScrollY = currentScroll;

            // Slow down the car engine vibration when scroll stops
            window.clearTimeout(scrollTimeout);
            scrollTimeout = window.setTimeout(() => {
                scrollSpeed.value = 0;
            }, 120);
        };

        // Emitter for scroll speed spark trails
        const spawnSparks = (x: number, y: number, count: number, direction: 'right' | 'left') => {
            for (let i = 0; i < count; i++) {
                // Sparks drift backwards from the exhaust
                const angle = direction === 'right' 
                    ? Math.PI + (Math.random() - 0.5) * 0.5
                    : (Math.random() - 0.5) * 0.5;
                
                const speed = Math.random() * 3.5 + 1.0;
                const maxLife = Math.random() * 20 + 8;

                sparks.value.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 0.1, // float up slightly
                    color: ['#ff5a1f', '#ff3300', '#00f0ff', '#ffaa00'][Math.floor(Math.random() * 4)],
                    size: Math.random() * 2.2 + 1.0,
                    alpha: 1,
                    life: maxLife,
                    decay: 1 / maxLife
                });
            }
        };

        const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: 'right' | 'left', _speed: number) => {
            ctx.save();
            // Center drawing around standard car center
            ctx.translate(x, y);
            
            // Flip car drawing horizontally if driving backwards (left)
            if (direction === 'left') {
                ctx.scale(-1, 1);
            }

            // Draw Neon Body Contour
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff5a1f';
            ctx.strokeStyle = '#ff5a1f';
            ctx.lineWidth = 2.2;

            ctx.beginPath();
            ctx.moveTo(-30, 8);
            ctx.lineTo(-30, 0);
            ctx.lineTo(-20, -3);
            ctx.lineTo(-24, -10);
            ctx.lineTo(-16, -10);
            ctx.lineTo(-12, -3);
            ctx.lineTo(-6, -4);
            ctx.lineTo(-3, -12);
            ctx.lineTo(10, -12);
            ctx.lineTo(16, -3);
            ctx.lineTo(30, -1);
            ctx.lineTo(33, 8);
            ctx.lineTo(23, 8);
            ctx.arc(17, 8, 6, 0, Math.PI, true);
            ctx.lineTo(-11, 8);
            ctx.arc(-17, 8, 6, 0, Math.PI, true);
            ctx.closePath();
            ctx.stroke();

            // Draw cyan window glass
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(-3, -10);
            ctx.lineTo(8, -10);
            ctx.lineTo(13, -3);
            ctx.lineTo(-4, -3);
            ctx.closePath();
            ctx.stroke();

            // Draw wheels with spokes
            drawWheel(ctx, -17, 8);
            drawWheel(ctx, 17, 8);

            // Glowing headlight beam
            const headlightGlow = ctx.createRadialGradient(33, 3, 0, 90, 3, 50);
            headlightGlow.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
            headlightGlow.addColorStop(1, 'rgba(0, 240, 255, 0)');
            ctx.fillStyle = headlightGlow;
            ctx.beginPath();
            ctx.moveTo(33, 0);
            ctx.lineTo(120, -18);
            ctx.lineTo(120, 24);
            ctx.closePath();
            ctx.fill();

            // Glowing Exhaust pipe dot
            ctx.fillStyle = '#ff3300';
            ctx.shadowColor = '#ff3300';
            ctx.beginPath();
            ctx.arc(-32, 6, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        const drawPlane = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: 'right' | 'left') => {
            ctx.save();
            ctx.translate(x, y);
            if (direction === 'left') {
                ctx.scale(-1, 1);
            }

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

        const drawBoat = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: 'right' | 'left') => {
            ctx.save();
            ctx.translate(x, y);
            if (direction === 'left') {
                ctx.scale(-1, 1);
            }

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

        const drawSuperman = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: 'right' | 'left') => {
            ctx.save();
            ctx.translate(x, y);
            if (direction === 'left') {
                ctx.scale(-1, 1);
            }

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

        const drawVehicle = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: 'right' | 'left', speed: number) => {
            if (activeVehicle.value === 'plane') {
                drawPlane(ctx, x, y, direction);
            } else if (activeVehicle.value === 'boat') {
                drawBoat(ctx, x, y, direction);
            } else if (activeVehicle.value === 'superman') {
                drawSuperman(ctx, x, y, direction);
            } else {
                drawCar(ctx, x, y, direction, speed);
            }
        };

        const drawWheel = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.lineWidth = 1.6;

            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.stroke();

            // Spin spokes based on time
            ctx.lineWidth = 0.8;
            const rot = (Date.now() / 110) % (Math.PI * 2);
            ctx.rotate(rot);
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(5, 0);
                ctx.stroke();
                ctx.rotate(Math.PI / 2);
            }
            ctx.restore();
        };

        // Spring engine updates
        const updatePhysics = (width: number) => {
            const carWidth = 66;
            const padding = 20;
            
            // Proportional target X coordinate mapped to scroll progress
            const targetX = padding + scrollPercent.value * (width - carWidth - 2 * padding) + carWidth / 2;

            // Smooth spring equations for glide deceleration
            const TENSION = 0.045;
            const DAMPING = 0.16;
            const ax = (targetX - carX.value) * TENSION - carVx.value * DAMPING;
            carVx.value += ax;
            carX.value += carVx.value;

            // Vibrate body based on speed
            const baseHeight = 36;
            const vibration = scrollSpeed.value > 0 ? (Math.random() - 0.5) * 1.5 : Math.sin(Date.now() * 0.015) * 0.4;
            carY.value = baseHeight + vibration;

            // Exhaust particles during motion
            if (scrollSpeed.value > 1.2) {
                // Emit offset backfires based on facing direction
                const offsetDir = scrollDirection.value === 'right' ? -1 : 1;
                const exhaustX = carX.value + offsetDir * 32;
                spawnSparks(exhaustX, carY.value + 6, 2, scrollDirection.value);
            }

            // Update Sparks physics
            for (let i = sparks.value.length - 1; i >= 0; i--) {
                const s = sparks.value[i];
                s.x += s.vx;
                s.y += s.vy;
                s.life--;
                s.alpha = Math.max(0, s.life * s.decay);
                if (s.life <= 0) {
                    sparks.value.splice(i, 1);
                }
            }
        };

        const renderCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
            ctx.clearRect(0, 0, width, height);

            const roadY = 46;

            // 1. Draw glowing orange/neon laser road
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(255, 90, 31, 0.8)';
            ctx.strokeStyle = '#ff5a1f';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(0, roadY);
            ctx.lineTo(width, roadY);
            ctx.stroke();
            ctx.restore();

            // 2. Draw glowing exhaust sparks
            for (const s of sparks.value) {
                ctx.save();
                ctx.globalAlpha = s.alpha;
                ctx.shadowBlur = 8;
                ctx.shadowColor = s.color;
                ctx.fillStyle = s.color;

                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // 3. Draw neon theme vehicle
            drawVehicle(ctx, carX.value, carY.value, scrollDirection.value, scrollSpeed.value);
        };

        const initCanvas = () => {
            const canvas = canvasRef.value;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const handleResize = () => {
                canvas.width = window.innerWidth;
                canvas.height = 56;
            };

            handleResize();
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleScroll, { passive: true });

            // Initialize values
            carX.value = 40;
            carVx.value = 0;
            sparks.value = [];

            const animLoop = () => {
                updatePhysics(canvas.width);
                renderCanvas(ctx, canvas.width, canvas.height);
                animationFrameId = requestAnimationFrame(animLoop);
            };

            animLoop();
        };

        const stopCanvas = () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            window.removeEventListener('scroll', handleScroll);
            window.clearTimeout(scrollTimeout);
        };

        onMounted(() => {
            initCanvas();
        });

        onBeforeUnmount(() => {
            stopCanvas();
        });

        return {
            canvasRef,
            isScrolled
        };
    }
});
</script>

<style lang="scss" scoped>
.scroll-car-container {
    position: fixed;
    bottom: -64px; /* Hide below viewport when not scrolled */
    left: 0;
    right: 0;
    height: 56px;
    background: linear-gradient(0deg, rgba(4, 6, 10, 0.92) 0%, rgba(4, 6, 10, 0) 100%);
    backdrop-filter: blur(1px);
    -webkit-backdrop-filter: blur(1px);
    pointer-events: none;
    z-index: 9998;
    transition: bottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

    &.is-active {
        bottom: 0; /* Slide in smoothly when user scrolls */
    }
}

.scroll-car-canvas {
    width: 100%;
    height: 100%;
    display: block;
}
</style>
