<script>
	import Control from './components/Control.svelte'
	import Space from './components/Space.svelte'


	let transform = ''

	const transformate = (val) => {
		transform = val.detail
	}

</script>

<Control on:generate={ transformate } />
<Space transformation={ transform }/>