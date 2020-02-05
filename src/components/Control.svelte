<script>
	import { createEventDispatcher } from 'svelte'

	// Create costum events
	let dispatch = createEventDispatcher()
	let transformation

	let coordonation = {
		x: 0,	y: 0,	z: 0,

		depth: 2,
		perspective: false
	}

	// watch changes
	$:	{

		if(coordonation.perspective) {
			transformation = `transform: perspective(${coordonation.depth}cm) 
												  rotateY(${coordonation.y}deg) 
												  rotateX(${coordonation.x}deg) 
												  rotateZ(${coordonation.z}deg)`
		} else {
			transformation = `transform: rotateY(${coordonation.y}deg) 
												  rotateX(${coordonation.x}deg) 
												  rotateZ(${coordonation.z}deg)`
		}

		dispatch('generate', {transformation, coordonation})
	}
</script>

<div class="control">
	<h1>CSS 3D Transformaions Generator</h1>

	<div class="slide">
		<label for="">Axe X <span>{ coordonation.x }deg</span></label>
		<input type="range" min="0" max="180" step="10" bind:value={ coordonation.x }>
	</div>

	<div class="slide">
		<label for="">Axe Y <span>{ coordonation.y }deg</span></label>
		<input type="range" min="0" max="180" step="10" bind:value={ coordonation.y }>
	</div>

	<div class="slide">
		<label for="">Axe Z <span>{ coordonation.z }deg</span></label>
		<input type="range" min="0" max="180" step="10" bind:value={ coordonation.z }>
	</div>

	<input type="checkbox" name="perspective" bind:checked={ coordonation.perspective }> Perspective 
	<strong>{ (coordonation.perspective) ? 'Enabled' : 'Disabled' }</strong><br><br>

	{#if coordonation.perspective}
		<div class="slide">
			<label for="">Depth<span>{ coordonation.depth }cm</span></label>
			<input type="range" min="1" max="10" step="1" bind:value={ coordonation.depth }>
		</div>
	{/if}

	<div class="code">
		{ transformation }
	</div>
</div>

<style>
	.control {
		height: 100vh;
		width: 20%;
		padding: 40px;
		float: left;
	}

	.control h1 {
		margin-bottom: 70px;
		font-size: 30px;
		font-family: 'Roboto';
		font-weight: 300;
	}

	.control .slide {
		width: 100%;
		margin-bottom: 20px;
	}

	.control .slide label {
		font-size: 14px;
	}

	.control .slide label span {
		float: right;
	}

	.control .slide input[type=range] {
		-webkit-appearance: none;
		margin: 10px 0;
		width: 100%;
	}

	.control .slide input[type=range]:focus {
		outline: none;
	}

	.control .slide input[type=range]::-webkit-slider-runnable-track {
		width: 100%;
		height: 5px;
		cursor: pointer;
		animate: 0.2s;
		background: rgba(15, 22, 41, .2);
		border-radius: 25px;
	}

	.control .slide input[type=range]::-webkit-slider-thumb {
		height: 7px;
		width: 39px;
		border-radius: 7px;
		background: #0F1629;
		cursor: pointer;
		-webkit-appearance: none;
		margin-top: -1px;
	}

	.control .slide input[type=range]::-moz-range-track {
		width: 100%;
		height: 5px;
		cursor: pointer;
		animate: 0.2s;
		background: rgba(15, 22, 41, .2);
		border-radius: 25px;
	}

	.control .slide input[type=range]::-moz-range-thumb {
		height: 7px;
		width: 39px;
		border-radius: 7px;
		background: #0F1629;
		cursor: pointer;
		-webkit-appearance: none;
		margin-top: -1px;
	}

	.control div.code {
		background: #0F1629;
		color: #F5B826;
		padding: 20px;
		font-size: 15px;
	}
</style>