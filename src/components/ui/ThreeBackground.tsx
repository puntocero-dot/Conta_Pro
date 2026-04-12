'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        try {
            // Scene setup
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            containerRef.current.appendChild(renderer.domElement);

            // Particles
            const particlesCount = 1500;
            const positions = new Float32Array(particlesCount * 3);
            const colors = new Float32Array(particlesCount * 3);

            for (let i = 0; i < particlesCount * 3; i++) {
                positions[i] = (Math.random() - 0.5) * 10;
            }

            const particlesGeometry = new THREE.BufferGeometry();
            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const particlesMaterial = new THREE.PointsMaterial({
                size: 0.015,
                color: '#ffd700', // Gold for Punto Cero branding
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
            });

            const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
            scene.add(particlesMesh);

            camera.position.z = 3;

            // Interaction
            let mouseX = 0;
            let mouseY = 0;

            const handleMouseMove = (event: MouseEvent) => {
                mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
                mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
            };

            window.addEventListener('mousemove', handleMouseMove);

            // Animation
            let animationFrameId: number;
            const animate = () => {
                animationFrameId = requestAnimationFrame(animate);

                particlesMesh.rotation.y += 0.001;
                particlesMesh.rotation.x += 0.0005;

                // Smooth movement towards mouse
                particlesMesh.position.x += (mouseX * 0.5 - particlesMesh.position.x) * 0.05;
                particlesMesh.position.y += (-mouseY * 0.5 - particlesMesh.position.y) * 0.05;

                renderer.render(scene, camera);
            };

            animate();

            // Handle resize
            const handleResize = () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            };

            window.addEventListener('resize', handleResize);

            return () => {
                cancelAnimationFrame(animationFrameId);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('resize', handleResize);
                if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
                    containerRef.current.removeChild(renderer.domElement);
                }
            };
        } catch (error) {
            console.error('Three.js background failed to load:', error);
            return () => {};
        }
    }, []);


    return (
        <div 
            ref={containerRef} 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                zIndex: -1,
                background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)'
            }} 
        />
    );
}
