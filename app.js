import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
 
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'


import ocean from './ocean.jpg'


import brush from './download.png'
export default class Sketch {
	constructor(options) {
		
		this.scene = new THREE.Scene()
		this.scene1 = new THREE.Scene()

		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0x000000, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
		this.mouse = new THREE.Vector2(0,0)
		this.prevMouse = new THREE.Vector2(0,0)
		this.currentWave = 0


		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.01,
			 10
		)

		this.baseTexture = new THREE.WebGLRenderTarget(
			this.width, this.height, {
				minFilter: THREE.LinearFilter,
				maxFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat
			}
		)
 
		this.camera.position.set(0, 0, 2) 


		const frustumSize = this.height
		const aspect = this.width / this.height
		this.camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, -1000, 1000 )
		this.camera.position.set(0,0,2)







		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0


		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)

		this.isPlaying = true
		this.mouseEvents()
		this.addObjects()		 
		this.resize()
		this.render()
		this.setupResize()

 
	}

	settings() {
		let that = this
		this.settings = {
			progress: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'progress', 0, 1, 0.01)
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height

 

		this.camera.updateProjectionMatrix()



	}


	addObjects() {
		let that = this
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: {value: 0},
				uDisplacement: {value: null},
				uTexture: {value: new THREE.TextureLoader().load(ocean)},

				resolution: {value: new THREE.Vector4()}
			},
			vertexShader,
			fragmentShader
		})
		this.max = 100
 

		
		this.geometry = new THREE.PlaneGeometry(40,40,1,1)
		this.geometryFullScreen = new THREE.PlaneGeometry(this.width, this.height,1,1)



		this.meshes = []

		for (let i = 0; i < this.max; i++) {
			let m = new THREE.MeshBasicMaterial({
				// color: 0xff0000,
				map: new THREE.TextureLoader().load(brush),
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthTest:false,
				depthWrite: false
			})	

			let mesh = new THREE.Mesh(
				this.geometry, m
			)
			mesh.visible = false
			mesh.rotation.z = 2 * Math.PI * Math.random()
			this.scene.add(mesh)

			this.meshes.push(mesh)
			
		}

 
		this.quad = new THREE.Mesh(this.geometryFullScreen, this.material)
 
		this.scene1.add(this.quad)
 
	}

	mouseEvents() {
		window.addEventListener('mousemove', e => {
			this.mouse.x = e.clientX - this.width / 2
			this.mouse.y = this.height / 2 - e.clientY

		})
	}


	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	setNewWave(x, y, index) {
		let mesh = this.meshes[index]
		mesh.visible = true
		mesh.position.x = x
		mesh.position.y = y
		mesh.scale.x = mesh.scale.y = 1
		mesh.material.opacity = 1

	}


	trackMousePos() {
		if(Math.abs(this.mouse.x - this.prevMouse.x ) < 4 && 
		Math.abs(this.mouse.y - this.prevMouse.y ) < 4) {


		} else {
			this.currentWave = (this.currentWave + 1) % this.max
			this.setNewWave(this.mouse.x, this.mouse.y, this.currentWave)
 		}
		this.prevMouse.x = this.mouse.x
		this.prevMouse.y = this.mouse.y


	}
	render() {
		this.trackMousePos()
		if(!this.isPlaying) return
		this.time += 0.05
		// this.material.uniforms.time.value = this.time
		 
		//this.renderer.setRenderTarget(this.renderTarget)
 
		//this.renderer.setRenderTarget(null)
 
		requestAnimationFrame(this.render.bind(this))

		this.renderer.setRenderTarget(this.baseTexture)
		this.renderer.render(this.scene, this.camera)
		this.material.uniforms.uDisplacement.value = this.baseTexture.texture
		this.renderer.setRenderTarget(null)
		this.renderer.clear()
		this.renderer.render(this.scene1, this.camera)


		this.meshes.forEach(mesh => {
			if(mesh.visible) {
			// mesh.position.x = this.mouse.x
			// mesh.position.y = this.mouse.y
			mesh.rotation.z += 0.02
			mesh.material.opacity *= 0.96
			
			mesh.scale.x = 0.98 * mesh.scale.x + 0.1
			mesh.scale.y = mesh.scale.x 
			if(mesh.material.opacity < 0.002) mesh.visible = false
			}



		})
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 