// Modern Animation Library - Essential Features
// Optimized for performance and ease of use

class AnimationEngine {
    // Core animation method with Web Animations API
    static animate(element, properties, options = {}) {
        const {
            duration = 800,
            easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            delay = 0,
            onStart = () => {},
            onComplete = () => {},
            onUpdate = () => {}
        } = options;
        
        if (!element || !properties) return null;
        
        const keyframes = [];
        const computedStyle = getComputedStyle(element);
        const initialStyles = {};
        
        // Store initial values
        for (const prop in properties) {
            const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            initialStyles[prop] = computedStyle.getPropertyValue(prop) || computedStyle[camelProp] || '0';
        }
        
        keyframes.push(initialStyles);
        keyframes.push(properties);
        
        onStart();
        
        const animation = element.animate(keyframes, {
            duration,
            easing,
            delay,
            fill: 'forwards'
        });
        
        animation.addEventListener('finish', () => {
            onComplete();
            element.dispatchEvent(new CustomEvent('animationComplete', {
                detail: { element, properties, options }
            }));
        });
        
        // Progress tracking
        if (onUpdate !== (() => {})) {
            const startTime = performance.now();
            const updateLoop = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                onUpdate(progress);
                
                if (progress < 1) {
                    requestAnimationFrame(updateLoop);
                }
            };
            requestAnimationFrame(updateLoop);
        }
        
        return animation;
    }
    
    // Staggered animations
    static stagger(elements, properties, options = {}) {
        const { stagger = 100, direction = 'normal', ...animOptions } = options;
        const animations = [];
        const elementsArray = Array.from(elements);
        
        const orderedElements = direction === 'reverse' 
            ? elementsArray.reverse()
            : direction === 'random'
            ? elementsArray.sort(() => Math.random() - 0.5)
            : elementsArray;
        
        orderedElements.forEach((element, index) => {
            const animation = this.animate(element, properties, {
                ...animOptions,
                delay: (animOptions.delay || 0) + (index * stagger)
            });
            animations.push(animation);
        });
        
        return {
            animations,
            pause: () => animations.forEach(a => a.pause()),
            play: () => animations.forEach(a => a.play()),
            reverse: () => animations.forEach(a => a.reverse()),
            cancel: () => animations.forEach(a => a.cancel())
        };
    }
    
    // Timeline for sequence animations
    static timeline() {
        const timeline = [];
        let totalDuration = 0;
        
        const timelineAPI = {
            to: (element, properties, options = {}) => {
                const startTime = totalDuration + (options.delay || 0);
                timeline.push({
                    element,
                    properties,
                    options: { ...options, delay: startTime },
                    startTime
                });
                totalDuration = Math.max(totalDuration, startTime + (options.duration || 800));
                return timelineAPI;
            },
            
            from: (element, fromProperties, options = {}) => {
                const currentStyles = {};
                for (const prop in fromProperties) {
                    currentStyles[prop] = getComputedStyle(element)[prop];
                }
                Object.assign(element.style, fromProperties);
                return timelineAPI.to(element, currentStyles, options);
            },
            
            set: (element, properties) => {
                Object.assign(element.style, properties);
                return timelineAPI;
            },
            
            play: () => {
                const animations = timeline.map(({ element, properties, options }) => 
                    AnimationEngine.animate(element, properties, options)
                );
                return { animations, totalDuration };
            }
        };
        
        return timelineAPI;
    }
}

// Scroll-triggered animations with Intersection Observer
class ScrollAnimations {
    constructor() {
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            { threshold: [0, 0.1, 0.5], rootMargin: '0px 0px -10% 0px' }
        );
        this.elements = new WeakMap();
    }
    
    register(element, animation, options = {}) {
        const { repeat = false, threshold = 0.1, onEnter, onLeave } = options;
        
        this.elements.set(element, {
            animation,
            options: { repeat, onEnter, onLeave },
            hasTriggered: false
        });
        
        this.observer.observe(element);
        return this;
    }
    
    handleIntersection(entries) {
        entries.forEach(entry => {
            const elementData = this.elements.get(entry.target);
            if (!elementData) return;
            
            const { animation, options, hasTriggered } = elementData;
            const { repeat, onEnter, onLeave } = options;
            
            if (entry.isIntersecting) {
                if (!hasTriggered || repeat) {
                    if (typeof animation === 'function') {
                        animation(entry.target, entry);
                    } else if (typeof animation === 'object') {
                        AnimationEngine.animate(entry.target, animation.properties, animation.options);
                    }
                    
                    elementData.hasTriggered = true;
                    onEnter && onEnter(entry.target, entry);
                }
            } else if (hasTriggered && repeat && onLeave) {
                onLeave(entry.target, entry);
            }
        });
    }
    
    // Preset animations
    static presets = {
        fadeIn: {
            properties: { opacity: '1', transform: 'translateY(0px)' },
            options: { duration: 800, easing: 'ease-out' }
        },
        slideInLeft: {
            properties: { opacity: '1', transform: 'translateX(0px)' },
            options: { duration: 800 }
        },
        slideInRight: {
            properties: { opacity: '1', transform: 'translateX(0px)' },
            options: { duration: 800 }
        },
        scaleIn: {
            properties: { opacity: '1', transform: 'scale(1)' },
            options: { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
        }
    };
    
    applyPreset(element, presetName, options = {}) {
        const preset = ScrollAnimations.presets[presetName];
        if (!preset) return this;
        
        // Set initial state
        const initialStates = {
            fadeIn: { opacity: '0', transform: 'translateY(30px)' },
            slideInLeft: { opacity: '0', transform: 'translateX(-50px)' },
            slideInRight: { opacity: '0', transform: 'translateX(50px)' },
            scaleIn: { opacity: '0', transform: 'scale(0.8)' }
        };
        
        if (initialStates[presetName]) {
            Object.assign(element.style, initialStates[presetName]);
        }
        
        return this.register(element, preset, options);
    }
}

// Interactive 3D Card Component
class Card3D {
    constructor(element, options = {}) {
        this.element = element;
        this.config = {
            maxRotation: 15,
            transition: 'transform 0.3s ease',
            glareEffect: options.glareEffect !== false,
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.element.style.transformStyle = 'preserve-3d';
        this.element.style.transition = this.config.transition;
        
        if (this.config.glareEffect) {
            this.createGlareEffect();
        }
        
        this.bindEvents();
    }
    
    createGlareEffect() {
        const glare = document.createElement('div');
        Object.assign(glare.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
            opacity: '0',
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease',
            borderRadius: 'inherit'
        });
        
        this.element.style.position = this.element.style.position || 'relative';
        this.element.appendChild(glare);
        this.glareElement = glare;
    }
    
    bindEvents() {
        this.element.addEventListener('mouseenter', () => {
            if (this.glareElement) this.glareElement.style.opacity = '0.3';
        });
        
        this.element.addEventListener('mousemove', (e) => {
            const rect = this.element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * this.config.maxRotation;
            const rotateY = ((centerX - x) / centerX) * this.config.maxRotation;
            
            this.element.style.transform = `
                perspective(1000px) 
                rotateX(${rotateX}deg) 
                rotateY(${rotateY}deg) 
                translateZ(10px) 
                scale(1.02)
            `;
            
            if (this.glareElement) {
                const glareX = (x / rect.width) * 100;
                const glareY = (y / rect.height) * 100;
                this.glareElement.style.background = `
                    radial-gradient(circle at ${glareX}% ${glareY}%, 
                    rgba(255,255,255,0.3) 0%, 
                    rgba(255,255,255,0) 50%)
                `;
            }
        });
        
        this.element.addEventListener('mouseleave', () => {
            this.element.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0) scale(1)';
            if (this.glareElement) this.glareElement.style.opacity = '0';
        });
    }
}

// Magnetic Button Effect
class MagneticButton {
    constructor(element, options = {}) {
        this.element = element;
        this.config = {
            strength: options.strength || 0.3,
            distance: options.distance || 50,
            scale: options.scale || 1.05,
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.element.style.transition = 'transform 0.3s ease';
        
        this.element.addEventListener('mouseenter', () => {
            this.isHovering = true;
        });
        
        this.element.addEventListener('mousemove', (e) => {
            if (!this.isHovering) return;
            
            const rect = this.element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = e.clientX - centerX;
            const deltaY = e.clientY - centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance < this.config.distance) {
                const moveX = deltaX * this.config.strength;
                const moveY = deltaY * this.config.strength;
                
                this.element.style.transform = `
                    translate3d(${moveX}px, ${moveY}px, 0) 
                    scale(${this.config.scale})
                `;
            }
        });
        
        this.element.addEventListener('mouseleave', () => {
            this.isHovering = false;
            this.element.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
        });
    }
}

// Optimized Particle System
class ParticleSystem {
    constructor(container, config = {}) {
        this.container = container;
        this.particles = [];
        this.config = {
            count: Math.min(config.count || 30, 50),
            colors: config.colors || ['#4f46e5', '#06b6d4', '#10b981'],
            speed: { min: 0.5, max: 1.5 },
            size: { min: 1, max: 3 },
            ...config
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.createParticles();
        this.start();
    }
    
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        Object.assign(this.canvas.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            pointerEvents: 'none',
            zIndex: '-1'
        });
        
        this.container.style.position = this.container.style.position || 'relative';
        this.container.appendChild(this.canvas);
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    createParticles() {
        for (let i = 0; i < this.config.count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * (this.config.speed.min + Math.random() * (this.config.speed.max - this.config.speed.min)),
                vy: (Math.random() - 0.5) * (this.config.speed.min + Math.random() * (this.config.speed.max - this.config.speed.min)),
                size: this.config.size.min + Math.random() * (this.config.size.max - this.config.size.min),
                color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
                opacity: 0.3 + Math.random() * 0.5
            });
        }
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Bounce off edges
            if (particle.x <= 0 || particle.x >= this.canvas.width) particle.vx *= -1;
            if (particle.y <= 0 || particle.y >= this.canvas.height) particle.vy *= -1;
            
            // Draw particle
            this.ctx.save();
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        if (this.isRunning) {
            requestAnimationFrame(() => this.animate());
        }
    }
    
    start() {
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
    }
}

// Utility functions
const AnimationUtils = {
    random: (min, max) => Math.random() * (max - min) + min,
    
    lerp: (start, end, factor) => start + (end - start) * factor,
    
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    clamp: (value, min, max) => Math.min(Math.max(value, min), max)
};

// ========================
// MAIN APPLICATION LOGIC
// ========================

document.addEventListener('DOMContentLoaded', function() {
    // Navigation functionality
    initNavigation();
    
    // Student data toggle functionality
    initStudentDataToggle();
    
    // Smooth scrolling
    initSmoothScrolling();
    
    // Back to top button
    initBackToTop();
    
    // Card animations
    initCardAnimations();
    
    // Scroll animations
    initScrollAnimations();
    
    // Hero background particles
    initHeroParticles();
});

// Navigation functionality
function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// Student data toggle functionality - MAIN FIX
function initStudentDataToggle() {
    const showStudentsBtn = document.getElementById('showStudents');
    const studentData = document.getElementById('studentData');
    const btnIcon = showStudentsBtn.querySelector('i');
    const btnText = showStudentsBtn.querySelector('span');
    
    let isVisible = false;
    
    // Initially hide the student data
    studentData.style.display = 'none';
    studentData.style.opacity = '0';
    studentData.style.transform = 'translateY(20px)';
    studentData.style.transition = 'all 0.5s ease';
    
    showStudentsBtn.addEventListener('click', function() {
        if (!isVisible) {
            // Show student data with animation
            studentData.style.display = 'block';
            
            // Force reflow before animating
            studentData.offsetHeight;
            
            studentData.style.opacity = '1';
            studentData.style.transform = 'translateY(0)';
            
            // Update button
            btnIcon.className = 'fas fa-eye-slash';
            btnText.textContent = 'Sembunyikan Data Siswa';
            showStudentsBtn.classList.add('active');
            
            // Animate student items with stagger
            const studentItems = document.querySelectorAll('.student-item');
            studentItems.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                item.style.transition = 'all 0.3s ease';
                
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });
            
            isVisible = true;
            
        } else {
            // Hide student data with animation
            studentData.style.opacity = '0';
            studentData.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                studentData.style.display = 'none';
            }, 500);
            
            // Update button
            btnIcon.className = 'fas fa-users';
            btnText.textContent = 'Tampilkan Data Siswa';
            showStudentsBtn.classList.remove('active');
            
            isVisible = false;
        }
        
        // Add ripple effect to button
        addRippleEffect(showStudentsBtn);
    });
}

// Add ripple effect to buttons
function addRippleEffect(button) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (rect.width / 2 - size / 2) + 'px';
    ripple.style.top = (rect.height / 2 - size / 2) + 'px';
    ripple.classList.add('ripple');
    
    // Add ripple styles
    Object.assign(ripple.style, {
        position: 'absolute',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.3)',
        transform: 'scale(0)',
        animation: 'ripple 0.6s linear',
        pointerEvents: 'none'
    });
    
    // Add keyframe animation
    if (!document.querySelector('#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    const existingRipple = button.querySelector('.ripple');
    if (existingRipple) {
        existingRipple.remove();
    }
    
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Back to top button
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.style.display = 'flex';
            backToTop.style.opacity = '1';
        } else {
            backToTop.style.opacity = '0';
            setTimeout(() => {
                if (window.pageYOffset <= 300) {
                    backToTop.style.display = 'none';
                }
            }, 300);
        }
    });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Card 3D animations
function initCardAnimations() {
    const memberCards = document.querySelectorAll('.member-card');
    memberCards.forEach(card => {
        new Card3D(card, {
            maxRotation: 10,
            glareEffect: true
        });
    });
    
    // Apply magnetic effect to buttons
    const buttons = document.querySelectorAll('.cta-button, .btn-primary');
    buttons.forEach(button => {
        new MagneticButton(button, {
            strength: 0.2,
            distance: 30,
            scale: 1.03
        });
    });
}

// Scroll animations
function initScrollAnimations() {
    const scrollAnim = new ScrollAnimations();
    
    // Animate section headers
    document.querySelectorAll('.section-header').forEach(header => {
        scrollAnim.applyPreset(header, 'fadeIn', { threshold: 0.3 });
    });
    
    // Animate member cards with stagger
    const memberCards = document.querySelectorAll('.member-card');
    memberCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px)';
        
        scrollAnim.register(card, {
            properties: { opacity: '1', transform: 'translateY(0)' },
            options: { 
                duration: 600, 
                delay: index * 100,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }
        }, { threshold: 0.2 });
    });
    
    // Animate advisor card
    const advisorCard = document.querySelector('.advisor-card');
    if (advisorCard) {
        scrollAnim.applyPreset(advisorCard, 'slideInLeft', { threshold: 0.3 });
    }
}

// Hero background particles
function initHeroParticles() {
    const hero = document.querySelector('.hero-section');
    if (hero) {
        new ParticleSystem(hero, {
            count: 25,
            colors: ['rgba(79, 70, 229, 0.3)', 'rgba(6, 182, 212, 0.3)', 'rgba(16, 185, 129, 0.3)'],
            speed: { min: 0.2, max: 0.8 },
            size: { min: 1, max: 2 }
        });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AnimationEngine,
        ScrollAnimations,
        Card3D,
        MagneticButton,
        ParticleSystem,
        AnimationUtils
    };
}