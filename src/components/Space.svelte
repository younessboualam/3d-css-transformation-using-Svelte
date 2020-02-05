<script>
	export let transformation;
</script>

<main>
	<div class="coords">
		{#if transformation.coordonation}
			<span>X: { transformation.coordonation.x }deg</span>
			<span>Y: { transformation.coordonation.y }deg</span>
			<span>Z: { transformation.coordonation.z }deg</span>
			<span>3D: { (transformation.coordonation.perspective) ? 'Enabled' : 'Disabled' }</span>
		{/if}
	</div>

	<div class="element" style={ transformation.transformation }></div>
</main>

<style>
	main {
		background: #0F1629;
		width: 80%;
		height: 100vh;
		float: right;
		display: flex;
		-ms-align-items: center;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		position: relative;
	}

	main .coords {
		position: absolute;
		left: 20px;
		top: 20px;
	}

	main .coords span {
		display: block;
		color: #F5B826
	}

	main .element {
		width: 400px;
		height: 400px;
		border: 1px solid #F5B826;
		background: 
        -o-repeating-linear-gradient(left, #F5B826 0, transparent 2px, transparent calc(100%/ 12)) ,
        -o-repeating-linear-gradient(bottom, #F5B826 0, transparent 2px, transparent calc(100%/ 12));
    	
    	background: 
        repeating-linear-gradient(to right, #F5B826 0, transparent 2px, transparent calc(100% / 12)),
        repeating-linear-gradient(to top, #F5B826 0, transparent 2px, transparent calc(100% / 12))
	}
</style>