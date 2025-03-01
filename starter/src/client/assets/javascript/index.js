let store = {
	track_id: undefined,
	track_name: undefined,
	player_id: undefined,
	player_name: undefined,
	race_id: undefined,
}

document.addEventListener("DOMContentLoaded", function() {
	onPageLoad()
	setupClickHandlers()
})

async function onPageLoad() {
	console.log("Getting form info for dropdowns!")
	try {
		const tracks = await getTracks()
		const htmlTracks = renderTrackCards(tracks)
		renderAt('#tracks', htmlTracks)

		const racers = await getRacers()
		const htmlRacers = renderRacerCars(racers)
		renderAt('#racers', htmlRacers)
	} catch(error) {
		console.log("Problem getting tracks and racers ::", error.message)
		console.error(error)
	}
}

function setupClickHandlers() {
	document.addEventListener('click', function(event) {
		const { target } = event

		if (target.matches('.card.track')) {
			handleSelectTrack(target)
			store.track_id = target.id
			store.track_name = target.innerHTML
		}

		if (target.matches('.card.racer')) {
			handleSelectRacer(target)
			store.player_id = target.id
			store.player_name = target.innerHTML
		}

		if (target.matches('#submit-create-race')) {
			event.preventDefault()
			handleCreateRace()
		}

		if (target.matches('#gas-peddle')) {
			handleAccelerate()
		}

		console.log("Store updated :: ", store)
	}, false)
}

async function delay(ms) {
	try {
		return await new Promise(resolve => setTimeout(resolve, ms))
	} catch(error) {
		console.log("an error shouldn't be possible here")
		console.log(error)
	}
}

async function handleCreateRace() {
	console.log("in create race")

	renderAt('#race', renderRaceStartView(store.track_name))

	const player_id = store.player_id
	const track_id = store.track_id

	try {
		const race = await createRace(player_id, track_id)
		console.log("RACE: ", race)
		store.race_id = race.ID

		await runCountdown()
		await startRace(store.race_id)
		await runRace(store.race_id)
	} catch (error) {
		console.log("Problem with handleCreateRace::", error)
	}
}

function runRace(raceID) {
	return new Promise(resolve => {
		let lastUpdateTime = 0
		const updateInterval = 200

		const updateRace = async () => {
			const now = Date.now()
			if (now - lastUpdateTime >= updateInterval) {
				lastUpdateTime = now

				try {
					const res = await getRace(raceID)
					console.log("Race status:", res.status)

					if (res.status === "in-progress") {
						renderAt('#leaderBoard', raceProgress(res.positions))
					} else if (res.status === "finished") {
						renderAt('#race', resultsView(res.positions))
						resolve(res)
					}
				} catch (err) {
					console.log("Problem with runRace::", err)
					resolve(null)
				}
			}

			requestAnimationFrame(updateRace)
		}

		requestAnimationFrame(updateRace)
	})
}

async function runCountdown() {
	try {
		await delay(1000)
		let timer = 3

		return new Promise(resolve => {
			const countdownInterval = setInterval(() => {
				document.getElementById('big-numbers').innerHTML = --timer
				if (timer === 0) {
					clearInterval(countdownInterval)
					resolve()
				}
			}, 1000)
		})
	} catch(error) {
		console.log(error)
	}
}

function handleSelectRacer(target) {
	console.log("selected a racer", target.id)

	const selected = document.querySelector('#racers .selected')
	if(selected) {
		selected.classList.remove('selected')
	}

	target.classList.add('selected')
}

function handleSelectTrack(target) {
	console.log("selected track", target.id)

	const selected = document.querySelector('#tracks .selected')
	if (selected) {
		selected.classList.remove('selected')
	}

	target.classList.add('selected')	
}

function handleAccelerate() {
	console.log("accelerate button clicked")
	accelerate(store.race_id)
		.then(() => {
			console.log("Acceleration successful")
		})
		.catch(err => {
			console.log("Acceleration failed::", err)
		})
}

function renderRacerCars(racers) {
	if (!racers.length) {
		return `
			<h4>Loading Racers...</h4>
		`
	}

	const results = racers.map(renderRacerCard).join('')

	return `
		<ul id="racers">
			${results}
		</ul>
	`
}

function renderRacerCard(racer) {
	const { id, driver_name } = racer
	return `<h4 class="card racer" id="${id}">${driver_name}</h4>`
}

function renderTrackCards(tracks) {
	if (!tracks.length) {
		return `
			<h4>Loading Tracks...</h4>
		`
	}

	const results = tracks.map(renderTrackCard).join('')

	return `
		<ul id="tracks">
			${results}
		</ul>
	`
}

function renderTrackCard(track) {
	const { id, name } = track
	return `<h4 id="${id}" class="card track">${name}</h4>`
}

function renderCountdown(count) {
	return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`
}

function renderRaceStartView(trackName) {
	return `
		<header>
			<h1>Race: ${trackName}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`
}

function resultsView(positions) {
	let userPlayer = positions.find(e => e.id === parseInt(store.player_id))
	if (userPlayer) {
		userPlayer.driver_name += " (you)"
	}
	let count = 1

	const results = positions.map(p => {
		return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`
	})

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			<h3>Race Results</h3>
			<p>The race is done! Here are the final results:</p>
			${results.join('')}
		</main>
	`
}

function raceProgress(positions) {
	let userPlayer = positions.find(e => e.id === parseInt(store.player_id))
	if (userPlayer) {
		userPlayer.driver_name += " (you)"
	}

	positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1)
	let count = 1

	const results = positions.map(p => {
		return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`
	})

	return `
		<table>
			${results.join('')}
		</table>
	`
}

function renderAt(element, html) {
	const node = document.querySelector(element)
	node.innerHTML = html
}

const SERVER = 'http://localhost:3001'

function defaultFetchOpts() {
	return {
		mode: 'cors',
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin' : SERVER,
		},
	}
}

function getTracks() {
	console.log(`calling server :: ${SERVER}/api/tracks`)
	return fetch(`${SERVER}/api/tracks`, {
		method: 'GET',
		...defaultFetchOpts(),
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with getTracks request::", err))
}

function getRacers() {
	return fetch(`${SERVER}/api/cars`, {
		method: 'GET',
		...defaultFetchOpts(),
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with getRacers request::", err))
}

function createRace(player_id, track_id) {
	player_id = parseInt(player_id)
	track_id = parseInt(track_id)
	const body = { player_id, track_id }
	
	return fetch(`${SERVER}/api/races`, {
		method: 'POST',
		...defaultFetchOpts(),
		dataType: 'jsonp',
		body: JSON.stringify(body)
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with createRace request::", err))
}

function getRace(id) {
	return fetch(`${SERVER}/api/races/${id}`, {
		method: 'GET',
		...defaultFetchOpts(),
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with getRace request::", err))
}

function startRace(id) {
	return fetch(`${SERVER}/api/races/${id}/start`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with getRace request::", err))
}

function accelerate(id) {
	return fetch(`${SERVER}/api/races/${id}/accelerate`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.then(res => {
		if (!res.ok) {
			throw new Error(`Server returned ${res.status}: ${res.statusText}`)
		}
		return res.json()
	})
	.catch(err => {
		console.log("Problem with accelerate request::", err)
		throw err
	})
}