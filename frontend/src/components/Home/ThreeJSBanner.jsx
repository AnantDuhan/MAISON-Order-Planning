import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './Home.css'; // We'll use the same CSS file

// --- IMPORTANT ---
// Make sure you have an 'images' folder in 'src' with all these textures.
import sunTextureImg from '../../images/solar.jpg';
import mercuryTextureImg from '../../images/mercury.jpg';
import venusTextureImg from '../../images/venus.jpg';
import earthTextureImg from '../../images/earth.jpg';
import marsTextureImg from '../../images/mars.jpg';
import jupiterTextureImg from '../../images/jupiter.jpeg';
import saturnTextureImg from '../../images/saturn.jpeg';
import saturnRingTextureImg from '../../images/saturn-ring.png';
import uranusTextureImg from '../../images/uranus.jpg';
import neptuneTextureImg from '../../images/neptune.jpg';
import spaceTextureImg from '../../images/space.jpg';


const ThreeJSBanner = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        // === SCENE, CAMERA, RENDERER ===
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 2000);
        camera.position.set(-90, 140, 140);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        currentMount.appendChild(renderer.domElement);

        // === CONTROLS ===
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 50;
        controls.maxDistance = 400;

        // === TEXTURES ===
        const textureLoader = new THREE.TextureLoader();
        const spaceTexture = textureLoader.load(spaceTextureImg);
        spaceTexture.colorSpace = THREE.SRGBColorSpace;
        scene.background = spaceTexture;

        // === SUN ===
        const sunTexture = textureLoader.load(sunTextureImg);
        const sun = new THREE.Mesh(
            new THREE.SphereGeometry(16, 64, 64),
            new THREE.MeshBasicMaterial({ map: sunTexture })
        );
        scene.add(sun);

        // === LIGHTING ===
        const pointLight = new THREE.PointLight(0xffffff, 3, 300);
        scene.add(pointLight);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(ambientLight);

        // === PLANET CREATION FUNCTION ===
        function createPlanet(size, texture, position, ring) {
            const planetTexture = textureLoader.load(texture);
            const planet = new THREE.Mesh(
                new THREE.SphereGeometry(size, 64, 64),
                new THREE.MeshStandardMaterial({ map: planetTexture })
            );
            const planetObj = new THREE.Object3D();
            planetObj.add(planet);
            scene.add(planetObj);
            planet.position.x = position;

            if (ring) {
                const ringTexture = textureLoader.load(ring.texture);
                const ringGeo = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 64);
                const ringMat = new THREE.MeshBasicMaterial({
                    map: ringTexture,
                    side: THREE.DoubleSide,
                    transparent: true,
                });
                const ringMesh = new THREE.Mesh(ringGeo, ringMat);
                ringMesh.rotation.x = -0.5 * Math.PI;
                planet.add(ringMesh);
            }
            
            // Orbital Ring
            const orbitalRing = new THREE.Mesh(
                new THREE.TorusGeometry(position, 0.08, 16, 100),
                new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.2 })
            );
            orbitalRing.rotation.x = Math.PI / 2;
            scene.add(orbitalRing);

            return { mesh: planet, obj: planetObj };
        }

        // === PLANETS DATA & CREATION ===
        const mercury = createPlanet(3.2, mercuryTextureImg, 28);
        const venus = createPlanet(5.8, venusTextureImg, 44);
        const earth = createPlanet(6, earthTextureImg, 62);
        const mars = createPlanet(4, marsTextureImg, 78);
        const jupiter = createPlanet(12, jupiterTextureImg, 100);
        const saturn = createPlanet(10, saturnTextureImg, 138, {
            texture: saturnRingTextureImg,
            innerRadius: 10,
            outerRadius: 20
        });
        const uranus = createPlanet(7, uranusTextureImg, 176, {
             texture: saturnRingTextureImg, // Re-using for a subtle ring
             innerRadius: 7,
             outerRadius: 12
        });
        const neptune = createPlanet(7, neptuneTextureImg, 200);

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
        const animate = () => {
            requestAnimationFrame(animate);

            // Self-rotation (Speeds reduced)
            sun.rotateY(0.001);
            mercury.mesh.rotateY(0.002);
            venus.mesh.rotateY(0.001);
            earth.mesh.rotateY(0.005);
            mars.mesh.rotateY(0.004);
            jupiter.mesh.rotateY(0.01);
            saturn.mesh.rotateY(0.009);
            uranus.mesh.rotateY(0.007);
            neptune.mesh.rotateY(0.008);

            // Orbital rotation (Speeds reduced)
            mercury.obj.rotateY(0.01);
            venus.obj.rotateY(0.005);
            earth.obj.rotateY(0.0025);
            mars.obj.rotateY(0.002);
            jupiter.obj.rotateY(0.0005);
            saturn.obj.rotateY(0.0002);
            uranus.obj.rotateY(0.0001);
            neptune.obj.rotateY(0.00005);

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

export default ThreeJSBanner;
