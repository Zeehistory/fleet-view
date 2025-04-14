"use client";

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from "@/components/ui/button"
import { HelpCircle, Download, Share2 } from 'lucide-react';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls, model: THREE.Mesh | THREE.Group;

    const init = () => {
      if (!containerRef.current) return;

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xe0e0e0);
      scene.fog = new THREE.Fog(0xe0e0e0, 2, 15);

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

    const loadModel = (file: File) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const fileContent = event.target?.result;
        if (!fileContent) return;

        const fileName = file.name.toLowerCase();

        // Ensure old model is removed before adding a new one
        if (model) {
          scene.remove(model);

          // Dispose of geometry and material
          if ((model as THREE.Mesh).geometry) {
            ((model as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
          }
          if ((model as THREE.Mesh).material) {
            if (Array.isArray((model as THREE.Mesh).material)) {
              ((model as THREE.Mesh).material as THREE.Material[]).forEach(material => material.dispose());
            } else {
              ((model as THREE.Mesh).material as THREE.Material).dispose();
            }
          }
        }
          
        // Function to create the mesh and add it to the scene
        const createMesh = (geometry: THREE.BufferGeometry) => {
            const hasVertexColors = geometry.hasAttribute('color');
            const material = new THREE.MeshPhongMaterial({
              color: 0x008080,
              specular: 0x111111,
              shininess: 200,
              vertexColors: hasVertexColors,
              side: THREE.DoubleSide // Ensure both sides of the faces are rendered
            });
    
            model = new THREE.Mesh(geometry, material);
            model.castShadow = true;
            model.receiveShadow = true;
    
            geometry.computeBoundingBox();
            const boundingBox = geometry.boundingBox;
            if (boundingBox) {
              const center = new THREE.Vector3();
              boundingBox.getCenter(center);
              model.position.sub(center); // Center the model
    
              const size = new THREE.Vector3();
              boundingBox.getSize(size);
              const maxDimension = Math.max(size.x, size.y, size.z);
              const scaleFactor = 3 / maxDimension;
              model.scale.set(scaleFactor, scaleFactor, scaleFactor);
            }
    
            scene.add(model);
          };
    


        if (fileName.endsWith('.stl')) {
          const loader = new STLLoader();
          const geometry = loader.parse(fileContent as string | ArrayBuffer);
          createMesh(geometry);
        } else if (fileName.endsWith('.obj')) {
          const loader = new OBJLoader();
          const object = loader.parse(fileContent as string);

          // If the loaded object is a group, handle it accordingly
          if (object instanceof THREE.Group) {
            model = object;
            model.traverse(function (child) {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Check if the child has existing material
                if (!(child as THREE.Mesh).material) {

                  const hasVertexColors = (child.geometry as THREE.BufferGeometry).hasAttribute('color');
                  const material = new THREE.MeshPhongMaterial({
                      color: 0x008080,
                      specular: 0x111111,
                      shininess: 200,
                      vertexColors: hasVertexColors,
                      side: THREE.DoubleSide  // Ensure both sides are rendered
                  });
                  (child as THREE.Mesh).material = material;
                }


                 (child.geometry as THREE.BufferGeometry).computeBoundingBox();
                 const boundingBox = (child.geometry as THREE.BufferGeometry).boundingBox;
                if (boundingBox) {
                  const center = new THREE.Vector3();
                  boundingBox.getCenter(center);
                  child.position.sub(center);
                  const size = new THREE.Vector3();
                  boundingBox.getSize(size);
                  const maxDimension = Math.max(size.x, size.y, size.z);
                  const scaleFactor = 3 / maxDimension;
                  child.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }


              }
            });
             scene.add(model);
          } else {
            // Handle single object OBJ files
            createMesh((object as THREE.Mesh).geometry as THREE.BufferGeometry);
          }
        }
      };

      if (file.name.toLowerCase().endsWith('.obj')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
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
      loadModel(file);
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
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="w-full h-full relative rounded-lg overflow-hidden" ref={containerRef}>
          <input type="file" accept=".stl, .obj" ref={fileInputRef} className="hidden" id="stl-upload" />
            <div className="absolute top-4 right-4 flex space-x-2">
              <Button variant="secondary" size="sm"  onClick={() => fileInputRef.current?.click()}>
                Upload STL/OBJ File
              </Button>
              <Button variant="secondary" size="sm">
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button variant="secondary" size="sm">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
