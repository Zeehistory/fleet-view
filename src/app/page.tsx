"use client";

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
// @ts-ignore
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
// @ts-ignore
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Button } from "@/components/ui/button"
import { HelpCircle, Palette, Box } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mtlFileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mtlFile, setMtlFile] = useState<File | null>(null);
  const [currentObjFile, setCurrentObjFile] = useState<File | null>(null);
  const [isWireframe, setIsWireframe] = useState(false);
  const [originalMaterials, setOriginalMaterials] = useState<Map<THREE.Mesh, THREE.Material>>(new Map());
  const [currentModel, setCurrentModel] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls, model: THREE.Object3D;

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
      controls.minDistance = 0.001;  // Allow closer zoom
      controls.maxDistance = 50;   // Allow further zoom out
      controls.target.set(0, 1, 0);
      controls.update();

      // Handle window resize
      window.addEventListener('resize', onWindowResize, false);
      onWindowResize(); // Initial resize

      animate();
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

    const loadModel = (file: File) => {
      const reader = new FileReader();

      // Function to create the mesh and add it to the scene
      const createMesh = (geometry: THREE.BufferGeometry) => {
        const hasVertexColors = geometry.hasAttribute('color');
        const material = new THREE.MeshStandardMaterial({
          vertexColors: hasVertexColors,
          side: THREE.DoubleSide,
          metalness: 0.3,
          roughness: 0.8,
          flatShading: true,
          emissive: 0x000000,
          color: 0xffffff, // Always use white as base color to show vertex colors properly
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
        setCurrentModel(model);
      };

      // Function to process the loaded object (whether from MTL or not)
      const processLoadedObject = (object: THREE.Object3D) => {
        if (object instanceof THREE.Group) {
          model = object;
          model.traverse(function (child) {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              
              // Check for vertex colors in the geometry
              const hasVertexColors = mesh.geometry.hasAttribute('color');
              
              // Create a material that will display colors properly
              const material = new THREE.MeshStandardMaterial({
                vertexColors: hasVertexColors,
                side: THREE.DoubleSide,
                metalness: 0.3,
                roughness: 0.8,
                flatShading: true,
                emissive: 0x000000,
                color: 0xffffff, // Always use white as base color to show vertex colors properly
              });
              
              // If the mesh already has a material with a color, use that color
              if (mesh.material && !hasVertexColors) {
                const existingMaterial = mesh.material as THREE.MeshStandardMaterial;
                if (existingMaterial.color) {
                  material.color = existingMaterial.color;
                }
              }
              
              mesh.material = material;
              
              // Center and scale the object
              mesh.geometry.computeBoundingBox();
              const boundingBox = mesh.geometry.boundingBox;
              if (boundingBox) {
                const center = new THREE.Vector3();
                boundingBox.getCenter(center);
                mesh.position.sub(center);
                const size = new THREE.Vector3();
                boundingBox.getSize(size);
                const maxDimension = Math.max(size.x, size.y, size.z);
                const scaleFactor = 3 / maxDimension;
                mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
              }
            }
          });
          
          scene.add(model);
          setCurrentModel(model);
        } else {
          // Handle single object OBJ files
          createMesh((object as THREE.Mesh).geometry as THREE.BufferGeometry);
        }
      };

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

        // Clear the original materials map
        setOriginalMaterials(new Map());

        if (fileName.endsWith('.stl')) {
          const loader = new STLLoader();
          const geometry = loader.parse(fileContent as string | ArrayBuffer);
          createMesh(geometry);
        } else if (fileName.endsWith('.obj')) {
          // Store the OBJ file for later use with MTL
          setCurrentObjFile(file);
          
          // Check if we have an MTL file
          if (mtlFile) {
            const mtlReader = new FileReader();
            mtlReader.onload = (mtlEvent) => {
              const mtlContent = mtlEvent.target?.result;
              if (!mtlContent) return;
              
              const mtlLoader = new MTLLoader();
              const materials = mtlLoader.parse(mtlContent as string);
              materials.preload();
              
              const objLoader = new OBJLoader();
              objLoader.setMaterials(materials);
              const object = objLoader.parse(fileContent as string);
              
              processLoadedObject(object);
            };
            
            mtlReader.readAsText(mtlFile);
          } else {
            // No MTL file, use default OBJ loader
            const loader = new OBJLoader();
            const object = loader.parse(fileContent as string);
            processLoadedObject(object);
          }
        } else if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
          // Load GLB/GLTF files
          const loader = new GLTFLoader();
          
          // Create a blob URL from the file content
          const blob = new Blob([fileContent as ArrayBuffer], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          
          loader.load(url, (gltf: any) => {
            // Process the loaded GLTF model
            model = gltf.scene;
            
            // Store original materials for toggling
            const materialsMap = new Map<THREE.Mesh, THREE.Material>();
            
            // Apply shadows to all meshes
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // Store original material
                if (mesh.material) {
                  if (Array.isArray(mesh.material)) {
                    // For meshes with multiple materials, store the first one
                    if (mesh.material.length > 0) {
                      materialsMap.set(mesh, mesh.material[0]);
                    }
                  } else {
                    materialsMap.set(mesh, mesh.material);
                  }
                }
                
                // Ensure materials are properly configured
                if (mesh.material) {
                  if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => {
                      if (mat instanceof THREE.MeshStandardMaterial) {
                        mat.needsUpdate = true;
                      }
                    });
                  } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    mesh.material.needsUpdate = true;
                  }
                }
              }
            });
            
            // Save the materials map to state
            setOriginalMaterials(materialsMap);
            
            // Center and scale the model
            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.sub(center);
            
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDimension = Math.max(size.x, size.y, size.z);
            const scaleFactor = 3 / maxDimension;
            model.scale.set(scaleFactor, scaleFactor, scaleFactor);
            
            // Add the model to the scene
            scene.add(model);
            setCurrentModel(model);
            
            // Clean up the blob URL
            URL.revokeObjectURL(url);
          }, undefined, (error: any) => {
            console.error('Error loading GLB/GLTF file:', error);
          });
        }
      };

      if (file.name.toLowerCase().endsWith('.obj')) {
        reader.readAsText(file);
      } else if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    };

    const handleFileSelect = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (!input.files || input.files.length === 0) return;

      const file = input.files[0];
      loadModel(file);
    };

    const handleMtlFileSelect = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (!input.files || input.files.length === 0) return;

      const file = input.files[0];
      setMtlFile(file);
      
      // If we already have an OBJ file loaded, reload it with the new MTL file
      if (currentObjFile) {
        loadModel(currentObjFile);
      }
    };

    init();

    if (fileInputRef.current) {
      fileInputRef.current.addEventListener('change', handleFileSelect);
    }

    if (mtlFileInputRef.current) {
      mtlFileInputRef.current.addEventListener('change', handleMtlFileSelect);
    }

    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (fileInputRef.current) {
        fileInputRef.current.removeEventListener('change', handleFileSelect);
      }
      if (mtlFileInputRef.current) {
        mtlFileInputRef.current.removeEventListener('change', handleMtlFileSelect);
      }
    };
  }, [mtlFile, currentObjFile]);

  // Toggle between colored and wireframe view
  const toggleWireframe = () => {
    if (!currentModel) return;
    
    const newIsWireframe = !isWireframe;
    setIsWireframe(newIsWireframe);
    
    // Create a wireframe material
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      wireframeLinewidth: 1,
    });
    
    // Apply the appropriate material to all meshes
    currentModel.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        if (newIsWireframe) {
          // Store the current material if not already stored
          if (!originalMaterials.has(mesh)) {
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                // For meshes with multiple materials, store the first one
                if (mesh.material.length > 0) {
                  originalMaterials.set(mesh, mesh.material[0]);
                }
              } else {
                originalMaterials.set(mesh, mesh.material);
              }
            }
          }
          
          // Apply wireframe material
          mesh.material = wireframeMaterial;
        } else {
          // Restore the original material
          const originalMaterial = originalMaterials.get(mesh);
          if (originalMaterial) {
            mesh.material = originalMaterial;
          }
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="w-full h-full relative rounded-lg overflow-hidden" ref={containerRef}>
          <input type="file" accept=".stl, .obj, .glb, .gltf" ref={fileInputRef} className="hidden" id="stl-upload" />
          <input type="file" accept=".mtl" ref={mtlFileInputRef} className="hidden" id="mtl-upload" />
          <div className="absolute top-4 left-12 z-10">
            <img 
              src="/fleet-logo.png"
              alt="Fleet Robotics Logo" 
              className="h-12 w-auto"
            />
          </div>
            <div className="absolute top-4 right-4 flex space-x-2">
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Upload 3D Model
              </Button>
              <Button variant="secondary" size="sm" onClick={() => mtlFileInputRef.current?.click()}>
                Upload MTL File
              </Button>
              <Button variant="secondary" size="sm" onClick={toggleWireframe}>
                {isWireframe ? <Palette className="h-4 w-4" /> : <Box className="h-4 w-4" />}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>How to use the Viewer</AlertDialogTitle>
                    <AlertDialogDescription>
                      <div>
                        <ul className="list-disc pl-5">
                          <li>Upload an STL, OBJ, GLB, or GLTF file using the "Upload 3D Model" button.</li>
                          <li>For OBJ files with materials, upload the corresponding MTL file using the "Upload MTL File" button.</li>
                          <li>GLB/GLTF files contain both geometry and materials in a single file.</li>
                          <li>Use the toggle button to switch between colored and wireframe views.</li>
                          <li>Rotate the model by clicking and dragging on the 3D space.</li>
                          <li>Zoom in and out using the mouse wheel or pinch gestures.</li>
                        </ul>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
        </div>
      </div>
    </div>
  );
}

