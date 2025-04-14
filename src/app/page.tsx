"use client";

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from "@/components/ui/button"
import Image from 'next/image';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls, stlModel: THREE.Mesh;

    const init = () => {
      if (!containerRef.current) return;

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xaaaaaa);
      scene.fog = new THREE.Fog(0xaaaaaa, 2, 15);

      // Camera
      camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
      camera.position.set(3, 3, 3);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      containerRef.current.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xbbbbbb);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      scene.add(directionalLight);

      // Controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 1;
      controls.maxDistance = 10;
      controls.target.set(0, 1, 0);
      controls.update();

      // Handle window resize
      window.addEventListener('resize', onWindowResize, false);
      onWindowResize(); // Initial resize

      animate();
    };

    const loadSTL = (file: File) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const stlContent = event.target?.result;
        if (!stlContent) return;

        const loader = new STLLoader();
        const geometry = loader.parse(stlContent as string | ArrayBuffer);

        // Ensure old model is removed before adding a new one
        if (stlModel) {
          scene.remove(stlModel);
          geometry.dispose();
          if (Array.isArray(stlModel.material)) {
            stlModel.material.forEach(material => material.dispose());
          } else {
            stlModel.material.dispose();
          }
        }

        const material = new THREE.MeshPhongMaterial({ color: 0x008080, specular: 0x111111, shininess: 200 });
        stlModel = new THREE.Mesh(geometry, material);

        stlModel.castShadow = true;
        stlModel.receiveShadow = true;

        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox;
        if (boundingBox) {
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            stlModel.position.sub(center); // Center the model

            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            const maxDimension = Math.max(size.x, size.y, size.z);
            const scaleFactor = 3 / maxDimension;
            stlModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }


        scene.add(stlModel);
      };

      reader.readAsArrayBuffer(file);
    };

    const onWindowResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    const handleFileSelect = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (!input.files || input.files.length === 0) return;

      const file = input.files[0];
      loadSTL(file);
    };

    init();

    if (fileInputRef.current) {
      fileInputRef.current.addEventListener('change', handleFileSelect);
    }

    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (fileInputRef.current) {
        fileInputRef.current.removeEventListener('change', handleFileSelect);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="p-6 border-b border-border shadow-sm bg-secondary text-secondary-foreground rounded-md flex items-center justify-between">
      <div className="flex items-center">
          
          <h1 className="text-lg font-semibold">STL View Master</h1>
        </div>
      </div>
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="w-full h-full relative rounded-lg shadow-md overflow-hidden" ref={containerRef}>
          <input type="file" accept=".stl" ref={fileInputRef} className="hidden" id="stl-upload" />
            <div className="absolute top-4 left-4 z-10">
              <Button variant="secondary" size="sm" className="rounded-md shadow-sm" onClick={() => fileInputRef.current?.click()}>
                Upload STL File
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
}

