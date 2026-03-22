import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import MacbookGLB from '../../images/macbook.glb';
import StudioHDR from '../../images/studio.hdr';

import './Home.css'; // We'll use the same CSS file

const ThreeJSMacbookBanner = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        // === SCENE, CAMERA, RENDERER ===
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, currentMount.clientWidth / currentMount.clientHeight, 0.1, 100);
        camera.position.set(0, 1.5, 9);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        currentMount.appendChild(renderer.domElement);
        
        // === CONTROLS ===
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.target.set(0, 0.75, 0);
        controls.autoRotate = true; 
        controls.autoRotateSpeed = 0.2;

        // === LIGHTING & ENVIRONMENT (Studio Setup) ===
        const rgbeLoader = new RGBELoader();
        // Correctly load from the public folder
        rgbeLoader.load(StudioHDR, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
        });

        // === MODEL LOADER ===
        let macbookModel;
        const loader = new GLTFLoader();

        // Load MacBook
        loader.load(
            // Correctly load from the public folder
            MacbookGLB,
            (gltf) => {
                macbookModel = gltf.scene;
                // Apply your desired scale, position, and rotation
                macbookModel.scale.set(0.14, 0.14, 0.14);
                macbookModel.position.set(0, 0.75, 0); 
                macbookModel.rotation.y = Math.PI / 1.4; 
                scene.add(macbookModel);
            },
            undefined,
            (error) => console.error('Error loading MacBook model:', error)
        );

        // iPhone and Vision Pro loaders have been removed.

        // === RESIZE HANDLER ===
        const handleResize = () => {
            if (currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        // === ANIMATION LOOP ===
        const clock = new THREE.Clock();
        const initialYPosition = -0.5; // Store the initial Y position

        const animate = () => {
            requestAnimationFrame(animate);
            
            const elapsedTime = clock.getElapsedTime();
            
            // Corrected hovering animation
            if (macbookModel) {
                // Animate based on the initial position
                macbookModel.position.y = initialYPosition + Math.sin(elapsedTime * 1.5) * 0.1;
            }

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (currentMount) {
                currentMount.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div className='banner' ref={mountRef}>
            <div className="banner-text">
                <h1>
                    Welcome to <span>Order Planning!!</span>
                </h1>
                <p>FIND OUR AMAZING RANGE OF PRODUCTS BELOW..</p>
            </div>
        </div>
    );
};

export default ThreeJSMacbookBanner;
