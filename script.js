document.addEventListener("DOMContentLoaded", () => {
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const useLenis = typeof Lenis !== 'undefined' && !isMobile && !prefersReducedMotion;
    let lenis = null;

    // 1. Initialize Lenis only for desktop so mobile keeps direct native scrolling
    if (useLenis) {
        lenis = new Lenis({
            duration: 1.15,
            easing: (t) => 1 - Math.pow(1 - t, 4),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            smoothWheel: true,
            wheelMultiplier: 1,
            syncTouch: false,
            infinite: false,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    const smoothAnchorLinks = document.querySelectorAll('a[href^="#"]');
    smoothAnchorLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetEl = document.querySelector(targetId);
            if (!targetEl) return;

            event.preventDefault();

            if (lenis) {
                lenis.scrollTo(targetEl, {
                    duration: 1.05,
                    easing: (t) => 1 - Math.pow(1 - t, 4),
                    offset: 0,
                });
            } else {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // 2. Dynamic footer year
    const yearEl = document.getElementById('year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    // 3. Intersection Observer for Scroll Reveals (Normal Sections)
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-down');
    const revealOptions = { rootMargin: "0px 0px -12% 0px", threshold: 0.08 };
    const revealOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);
    revealElements.forEach(el => revealOnScroll.observe(el));

    // Reveal Header immediately
    setTimeout(() => {
        const header = document.querySelector('.header');
        if (header) header.classList.add('is-revealed');
    }, 100);

    // 4. Services Deck Expansion
    const serviceDeckCards = Array.from(document.querySelectorAll('.service-card'));
    if (serviceDeckCards.length) {
        const setActiveServiceCard = (index) => {
            serviceDeckCards.forEach((card, cardIndex) => {
                const isActive = cardIndex === index;
                card.classList.toggle('active', isActive);
                card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        };

        serviceDeckCards.forEach((card, index) => {
            card.addEventListener('click', () => setActiveServiceCard(index));
        });
    }

    // 5. Interactive About Cards
    const aboutTiltCards = Array.from(document.querySelectorAll('.about-tilt-card'));
    if (aboutTiltCards.length) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        aboutTiltCards.forEach((card) => {
            if (reduceMotion) return;

            card.addEventListener('mousemove', (event) => {
                const bounds = card.getBoundingClientRect();
                const px = (event.clientX - bounds.left) / bounds.width;
                const py = (event.clientY - bounds.top) / bounds.height;
                const rotateY = (px - 0.5) * 8;
                const rotateX = (0.5 - py) * 8;

                card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // ==========================================
    // 5. Canvas Sequence Animation & Preloader
    // ==========================================
    const canvas = document.getElementById("hero-canvas");
    if (canvas) {
        const context = canvas.getContext("2d");
        const frameCount = 240;
        const images = [];
        let imagesLoaded = 0;
        let lastRenderedFrame = -1;
        let heroScrollRaf = null;

        const currentFrame = index => `Hero-Section/ezgif-frame-${(index + 1).toString().padStart(3, '0')}.png`;

        const preloader = document.getElementById('preloader');
        const progressBar = document.getElementById('progress-bar');
        const loaderPercent = document.getElementById('loader-percent');

        // Preload frames
        const handleLoad = () => {
            imagesLoaded++;
            const progress = Math.round((imagesLoaded / frameCount) * 100);
            if(progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            if(loaderPercent) loaderPercent.textContent = `${progress}%`;

            if (imagesLoaded === frameCount) {
                // Set canvas internal resolution to match the first image
                if (images[0] && images[0].width) {
                    canvas.width = images[0].width;
                    canvas.height = images[0].height;
                }
                
                updateImage(0); // Draw first frame so we can sample it
                
                // Dynamically match website background color (Requires local server to avoid CORS error)
                try {
                    const pixel = context.getImageData(0, 0, 1, 1).data;
                    const topColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
                    document.documentElement.style.setProperty('--dynamic-bg', topColor);
                    document.body.style.backgroundColor = 'var(--dynamic-bg)';
                    
                    const stickyHero = document.querySelector('.sticky-hero');
                    if (stickyHero) stickyHero.style.backgroundColor = 'var(--dynamic-bg)';
                } catch (e) {
                    console.warn("Canvas Tainted by local file protocol. Defaulting to CSS background color.");
                    document.documentElement.style.setProperty('--dynamic-bg', '#ffffff');
                }
                
                // Hide loader
                setTimeout(() => {
                    if(preloader) preloader.classList.add('hidden');
                    
                    // Trigger layer 1 to appear initially
                    const layer1 = document.getElementById('hero-text-1');
                    if (layer1) layer1.classList.add('active');
                }, 500);
            }
        };

        for (let i = 0; i < frameCount; i++) {
            const img = new Image();
            img.onload = handleLoad;
            img.onerror = () => {
                console.warn(`Failed to pull frame ${i}.`);
                handleLoad();
            };
            img.src = currentFrame(i);
            images.push(img);
        }

        function updateImage(index) {
            if (!images[index]) return;
            if (index === lastRenderedFrame) return;
            lastRenderedFrame = index;
            // Clear and draw image filling the canvas resolution
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(images[index], 0, 0);
        }

        const updateHeroScrollState = () => {
            heroScrollRaf = null;
            const container = document.getElementById('hero');
            if (!container) return;

            // Calculate progress logic
            const start = container.offsetTop;
            const maxScroll = container.offsetHeight - window.innerHeight;
            
            let scrollProgress = (window.scrollY - start) / maxScroll;
            scrollProgress = Math.max(0, Math.min(1, scrollProgress));
            
            // Sync vertical scroller logic
            const scrollMarker = document.getElementById('scroll-marker');
            if (scrollMarker) {
                scrollMarker.style.height = `${scrollProgress * 100}%`;
            }

            // Frame calculation based on scroll progress
            const frameIndex = Math.min(
                frameCount - 1,
                Math.floor(scrollProgress * frameCount)
            );

            const sampledFrameIndex = isMobile
                ? Math.round(frameIndex / 3) * 3
                : frameIndex;

            updateImage(sampledFrameIndex);

            // Text reveal mapping logic based on percentage (scrollProgress)
            const layer1 = document.getElementById('hero-text-1');
            const layer2 = document.getElementById('hero-text-2');

            if (layer1 && layer2) {
                if (scrollProgress >= 0 && scrollProgress < 0.25) {
                    layer1.classList.add('active');
                    layer2.classList.remove('active');
                } else if (scrollProgress >= 0.35 && scrollProgress < 0.75) {
                    layer1.classList.remove('active');
                    layer2.classList.add('active');
                } else {
                    layer1.classList.remove('active');
                    layer2.classList.remove('active');
                }
            }
        };

        const requestHeroScrollUpdate = () => {
            if (heroScrollRaf !== null) return;
            heroScrollRaf = window.requestAnimationFrame(updateHeroScrollState);
        };

        if (lenis) {
            lenis.on('scroll', requestHeroScrollUpdate);
        } else {
            window.addEventListener('scroll', requestHeroScrollUpdate, { passive: true });
        }
        window.addEventListener('resize', requestHeroScrollUpdate, { passive: true });
        updateHeroScrollState();
    }

    // ==========================================
    // 5. Selected Work Autoplay Carousel
    // ==========================================
    const workPanel = document.querySelector('.workflow-glass-panel');
    const workNames = Array.from(document.querySelectorAll('.name-item'));
    const workCases = Array.from(document.querySelectorAll('.workflow-case'));
    const workProgressDots = Array.from(document.querySelectorAll('.workflow-progress-dot'));

    if (workPanel && workNames.length && workCases.length) {
        let activeIndex = workNames.findIndex((item) => item.classList.contains('active'));
        let autoRotateId = null;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const rotationDelay = reduceMotion ? 4200 : 1500;

        if (activeIndex < 0) activeIndex = 0;

        const setActiveCase = (index) => {
            activeIndex = index;

            workNames.forEach((item, itemIndex) => {
                const isActive = itemIndex === index;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-current', isActive ? 'true' : 'false');
            });

            workCases.forEach((item, itemIndex) => {
                item.classList.toggle('active', itemIndex === index);
            });

            workProgressDots.forEach((dot, dotIndex) => {
                dot.classList.toggle('active', dotIndex === index);
            });
        };

        const advanceCase = () => {
            setActiveCase((activeIndex + 1) % workCases.length);
        };

        const startAutoRotate = () => {
            if (autoRotateId || workCases.length < 2) return;
            autoRotateId = window.setInterval(advanceCase, rotationDelay);
        };

        const stopAutoRotate = () => {
            if (!autoRotateId) return;
            window.clearInterval(autoRotateId);
            autoRotateId = null;
        };

        workNames.forEach((item, index) => {
            item.tabIndex = 0;
            item.addEventListener('click', () => {
                setActiveCase(index);
                stopAutoRotate();
                startAutoRotate();
            });

            item.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveCase(index);
                    stopAutoRotate();
                    startAutoRotate();
                }
            });
        });

        workPanel.addEventListener('mouseenter', stopAutoRotate);
        workPanel.addEventListener('mouseleave', startAutoRotate);
        workPanel.addEventListener('focusin', stopAutoRotate);
        workPanel.addEventListener('focusout', startAutoRotate);

        setActiveCase(activeIndex);
        if (!reduceMotion) {
            startAutoRotate();
        }
    }

    // ==========================================
    // 6. Interactive Floating Particles (Mouse Hover Repulse)
    // ==========================================
    const particleCanvas = document.getElementById('interactive-particles');
    if (particleCanvas) {
        const pCtx = particleCanvas.getContext('2d');
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;

        let particlesArray = [];
        let mouse = {
            x: null,
            y: null,
            radius: 120 // Connection/repulsion radius
        }

        if (!isMobile) {
            window.addEventListener('mousemove', function(event) {
                mouse.x = event.x;
                mouse.y = event.y;
            });

            window.addEventListener('mouseout', function() {
                mouse.x = undefined;
                mouse.y = undefined;
            });
        }

        window.addEventListener('resize', function() {
            particleCanvas.width = window.innerWidth;
            particleCanvas.height = window.innerHeight;
            initParticles();
        });

        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
                this.density = (Math.random() * 15) + 1;
                this.vx = 0;
                this.vy = 0;
                this.friction = 0.92; // Ensures smooth gliding
            }

            draw() {
                pCtx.beginPath();
                pCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                pCtx.fillStyle = this.color;
                pCtx.shadowBlur = 5; // Tight intense black
                pCtx.shadowColor = 'rgba(0, 0, 0, 1)';
                pCtx.fill();
            }

            update() {
                // Bounce off edges (can roam anywhere now)
                if (this.x > particleCanvas.width || this.x < 0) {
                    this.directionX = -this.directionX;
                    this.x = Math.max(0, Math.min(this.x, particleCanvas.width));
                }
                if (this.y > particleCanvas.height || this.y < 0) {
                    this.directionY = -this.directionY;
                    this.y = Math.max(0, Math.min(this.y, particleCanvas.height));
                }

                // Invisible force-field covering the person
                let personX = particleCanvas.width * 0.70;
                let personY = particleCanvas.height * 0.60;
                let personRadius = Math.min(particleCanvas.width * 0.22, 350);

                let pdx = personX - this.x;
                let pdy = personY - this.y;
                let pDistance = Math.sqrt(pdx*pdx + pdy*pdy);

                if (pDistance < personRadius) {
                    // Soft natural bounce off the person's body
                    const nx = pdx / pDistance;
                    const ny = pdy / pDistance;
                    this.vx -= nx * 0.3;
                    this.vy -= ny * 0.3;
                }

                // Mouse interactivity - repel
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < mouse.radius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = ((mouse.radius - distance) / mouse.radius);
                    // Add smooth velocity
                    this.vx -= forceDirectionX * force * this.density * 0.05;
                    this.vy -= forceDirectionY * force * this.density * 0.05;
                }

                // Apply base drift + velocity
                this.x += this.directionX + this.vx;
                this.y += this.directionY + this.vy;

                // Bleed off velocity over time (ease-out)
                this.vx *= this.friction;
                this.vy *= this.friction;

                this.draw();
            }
        }

        function initParticles() {
            particlesArray = [];
            let numberOfParticles = window.innerWidth < 700 ? 8 : 35;
            
            for (let i = 0; i < numberOfParticles; i++) {
                let size = (Math.random() * 1.5) + 0.5; // Back to tiny (0.5 to 2.0)
                let x = (Math.random() * (innerWidth - size * 2)) + size * 2;
                let y = (Math.random() * (innerHeight - size * 2)) + size * 2;
                let directionX = (Math.random() * 0.25) - 0.12; 
                let directionY = (Math.random() * 0.25) - 0.12;
                let color = 'rgba(0, 0, 0, 1)'; // Pitch black, zero transparency

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        function animateParticles() {
            requestAnimationFrame(animateParticles);
            pCtx.clearRect(0, 0, innerWidth, innerHeight);

            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
            }
        }

        initParticles();
        if (!isMobile && !prefersReducedMotion) {
            animateParticles();
        } else {
            pCtx.clearRect(0, 0, innerWidth, innerHeight);
            particlesArray.forEach((particle) => particle.draw());
        }
    }

    // ==========================================
    // 7. Work Section Space Particles
    // ==========================================
    const workParticleCanvas = document.getElementById('work-particles');
    const workSection = document.getElementById('work');

    if (workParticleCanvas && workSection) {
        const starContext = workParticleCanvas.getContext('2d');
        let stars = [];
        let starAnimationId = null;

        const setWorkCanvasSize = () => {
            const bounds = workSection.getBoundingClientRect();
            const ratio = Math.min(window.devicePixelRatio || 1, 2);

            workParticleCanvas.width = Math.floor(bounds.width * ratio);
            workParticleCanvas.height = Math.floor(bounds.height * ratio);
            workParticleCanvas.style.width = `${bounds.width}px`;
            workParticleCanvas.style.height = `${bounds.height}px`;
            starContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        };

        const createStars = () => {
            const width = workParticleCanvas.clientWidth;
            const height = workParticleCanvas.clientHeight;
            const starCount = window.innerWidth <= 700
                ? Math.max(8, Math.floor((width * height) / 68000))
                : Math.max(36, Math.floor((width * height) / 18000));

            stars = Array.from({ length: starCount }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.6 + 0.35,
                alpha: Math.random() * 0.55 + 0.18,
                speedX: (Math.random() - 0.5) * 0.08,
                speedY: Math.random() * 0.18 + 0.04,
                twinkle: Math.random() * Math.PI * 2,
                hue: Math.random() > 0.82 ? 195 : 0
            }));
        };

        const drawStars = () => {
            const width = workParticleCanvas.clientWidth;
            const height = workParticleCanvas.clientHeight;

            starContext.clearRect(0, 0, width, height);

            stars.forEach((star) => {
                star.x += star.speedX;
                star.y += star.speedY;
                star.twinkle += 0.02;

                if (star.y > height + 10) {
                    star.y = -10;
                    star.x = Math.random() * width;
                }

                if (star.x > width + 10) star.x = -10;
                if (star.x < -10) star.x = width + 10;

                const flicker = 0.65 + Math.sin(star.twinkle) * 0.35;
                const glowAlpha = star.alpha * flicker;
                const fill = star.hue === 195
                    ? `rgba(115, 216, 255, ${glowAlpha})`
                    : `rgba(255, 255, 255, ${glowAlpha})`;

                starContext.beginPath();
                starContext.fillStyle = fill;
                starContext.shadowBlur = 10;
                starContext.shadowColor = fill;
                starContext.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                starContext.fill();

                if (star.radius > 1.3) {
                    starContext.strokeStyle = `rgba(255,255,255,${glowAlpha * 0.35})`;
                    starContext.lineWidth = 0.5;
                    starContext.beginPath();
                    starContext.moveTo(star.x - 3, star.y);
                    starContext.lineTo(star.x + 3, star.y);
                    starContext.moveTo(star.x, star.y - 3);
                    starContext.lineTo(star.x, star.y + 3);
                    starContext.stroke();
                }

                starContext.shadowBlur = 0;
            });

            starAnimationId = requestAnimationFrame(drawStars);
        };

        const refreshStars = () => {
            setWorkCanvasSize();
            createStars();
        };

        refreshStars();
        if (!isMobile && !prefersReducedMotion) {
            drawStars();
        } else {
            drawStars();
            if (starAnimationId) {
                cancelAnimationFrame(starAnimationId);
                starAnimationId = null;
            }
        }

        window.addEventListener('resize', refreshStars);
        workSection.addEventListener('mouseleave', () => {
            if (!starAnimationId) drawStars();
        });
    }

});
