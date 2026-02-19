/// outcome.fi Level 2 contract for multi-scenario universes.
module move_hackathon::outcome_fi_v2 {
    use std::signer;
    use std::string;
    use std::string::String;
    use std::vector;
    use aptos_framework::event;

    const STORE_ADDRESS: address = @move_hackathon;

    const STATUS_OPEN: u8 = 0;
    const STATUS_PARTIAL: u8 = 1;
    const STATUS_COMPLETE: u8 = 2;

    const PHASE_COMMIT: u8 = 0;
    const PHASE_REVEAL: u8 = 1;
    const PHASE_RESOLVED: u8 = 2;
    const NO_WINNER: u8 = 255;

    const E_STORE_ALREADY_EXISTS: u64 = 1;
    const E_STORE_NOT_FOUND: u64 = 2;
    const E_NOT_ADMIN: u64 = 3;
    const E_UNIVERSE_NOT_FOUND: u64 = 4;
    const E_SCENARIO_NOT_FOUND: u64 = 5;
    const E_INVALID_CHOICE: u64 = 6;
    const E_ALREADY_VOTED: u64 = 7;
    const E_WRONG_PHASE: u64 = 8;
    const E_UNIVERSE_ALREADY_COMPLETE: u64 = 9;
    const E_UNIVERSE_NOT_READY_TO_SEAL: u64 = 10;
    const E_EMPTY_STORY_HASH: u64 = 11;

    struct UniverseStore has key {
        next_universe_id: u64,
        next_scenario_id: u64,
        universes: vector<Universe>,
        scenarios: vector<Scenario>,
    }

    struct Universe has store, drop {
        id: u64,
        headline: String,
        scenario_ids: vector<u64>,
        status: u8,
        final_story_hash: String,
        admin: address,
    }

    struct Scenario has store, drop {
        id: u64,
        universe_id: u64,
        question: String,
        choices: vector<String>,
        phase: u8,
        vote_counts: vector<u64>,
        total_votes: u64,
        winning_choice: u8,
    }

    struct VoteReceipt has key {
        scenario_ids: vector<u64>,
    }

    #[event]
    struct UniverseCreated has drop, store {
        universe_id: u64,
        headline: String,
        admin: address,
    }

    #[event]
    struct ScenarioAdded has drop, store {
        universe_id: u64,
        scenario_id: u64,
        question: String,
    }

    #[event]
    struct ScenarioVoteCast has drop, store {
        scenario_id: u64,
        voter: address,
        choice: u8,
        total_votes: u64,
    }

    #[event]
    struct ScenarioPhaseAdvanced has drop, store {
        scenario_id: u64,
        new_phase: u8,
        admin: address,
    }

    #[event]
    struct ScenarioResolved has drop, store {
        scenario_id: u64,
        winning_choice: u8,
        winning_text: String,
        admin: address,
    }

    #[event]
    struct UniverseSealed has drop, store {
        universe_id: u64,
        final_story_hash: String,
        admin: address,
    }

    public entry fun init_store(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == STORE_ADDRESS, E_NOT_ADMIN);
        assert!(!exists<UniverseStore>(STORE_ADDRESS), E_STORE_ALREADY_EXISTS);

        move_to(
            admin,
            UniverseStore {
                next_universe_id: 0,
                next_scenario_id: 0,
                universes: vector::empty<Universe>(),
                scenarios: vector::empty<Scenario>(),
            },
        );
    }

    public entry fun create_universe(admin: &signer, headline: String) acquires UniverseStore {
        assert_admin(admin);
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);

        let store = borrow_global_mut<UniverseStore>(STORE_ADDRESS);
        let universe_id = store.next_universe_id;
        store.next_universe_id = store.next_universe_id + 1;

        vector::push_back(
            &mut store.universes,
            Universe {
                id: universe_id,
                headline: copy headline,
                scenario_ids: vector::empty<u64>(),
                status: STATUS_OPEN,
                final_story_hash: empty_string(),
                admin: STORE_ADDRESS,
            },
        );

        event::emit(UniverseCreated {
            universe_id,
            headline,
            admin: STORE_ADDRESS,
        });
    }

    public entry fun add_scenario(
        admin: &signer,
        universe_id: u64,
        question: String,
        a: String,
        b: String,
        c: String,
        d: String,
    ) acquires UniverseStore {
        assert_admin(admin);
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);

        let store = borrow_global_mut<UniverseStore>(STORE_ADDRESS);
        let universe_index = universe_index(&store.universes, universe_id);
        let universe_view = vector::borrow(&store.universes, universe_index);
        assert!(universe_view.status != STATUS_COMPLETE, E_UNIVERSE_ALREADY_COMPLETE);

        let scenario_id = store.next_scenario_id;
        store.next_scenario_id = store.next_scenario_id + 1;

        let choices = vector::empty<String>();
        vector::push_back(&mut choices, a);
        vector::push_back(&mut choices, b);
        vector::push_back(&mut choices, c);
        vector::push_back(&mut choices, d);

        let vote_counts = vector::empty<u64>();
        vector::push_back(&mut vote_counts, 0);
        vector::push_back(&mut vote_counts, 0);
        vector::push_back(&mut vote_counts, 0);
        vector::push_back(&mut vote_counts, 0);

        vector::push_back(
            &mut store.scenarios,
            Scenario {
                id: scenario_id,
                universe_id,
                question: copy question,
                choices,
                phase: PHASE_COMMIT,
                vote_counts,
                total_votes: 0,
                winning_choice: NO_WINNER,
            },
        );
        let universe_mut = vector::borrow_mut(&mut store.universes, universe_index);
        vector::push_back(&mut universe_mut.scenario_ids, scenario_id);

        event::emit(ScenarioAdded {
            universe_id,
            scenario_id,
            question,
        });
    }

    public entry fun vote(voter: &signer, scenario_id: u64, choice: u8) acquires UniverseStore, VoteReceipt {
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);
        assert!(choice < 4, E_INVALID_CHOICE);

        let voter_addr = signer::address_of(voter);
        assert!(!receipt_contains(voter_addr, scenario_id), E_ALREADY_VOTED);

        let store = borrow_global_mut<UniverseStore>(STORE_ADDRESS);
        let scenario_index = scenario_index(&store.scenarios, scenario_id);
        let scenario = vector::borrow_mut(&mut store.scenarios, scenario_index);
        assert!(scenario.phase == PHASE_COMMIT, E_WRONG_PHASE);

        let count_ref = vector::borrow_mut(&mut scenario.vote_counts, choice as u64);
        *count_ref = *count_ref + 1;
        scenario.total_votes = scenario.total_votes + 1;

        event::emit(ScenarioVoteCast {
            scenario_id,
            voter: voter_addr,
            choice,
            total_votes: scenario.total_votes,
        });

        if (exists<VoteReceipt>(voter_addr)) {
            let receipt = borrow_global_mut<VoteReceipt>(voter_addr);
            vector::push_back(&mut receipt.scenario_ids, scenario_id);
        } else {
            let scenario_ids = vector::empty<u64>();
            vector::push_back(&mut scenario_ids, scenario_id);
            move_to(voter, VoteReceipt { scenario_ids });
        };
    }

    public entry fun advance_phase(admin: &signer, scenario_id: u64) acquires UniverseStore {
        assert_admin(admin);
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);

        let store = borrow_global_mut<UniverseStore>(STORE_ADDRESS);
        let index = scenario_index(&store.scenarios, scenario_id);
        let scenario = vector::borrow_mut(&mut store.scenarios, index);
        assert!(scenario.phase == PHASE_COMMIT, E_WRONG_PHASE);

        scenario.phase = PHASE_REVEAL;
        event::emit(ScenarioPhaseAdvanced {
            scenario_id,
            new_phase: PHASE_REVEAL,
            admin: STORE_ADDRESS,
        });
    }

    public entry fun resolve_scenario(admin: &signer, scenario_id: u64) acquires UniverseStore {
        assert_admin(admin);
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);

        let store = borrow_global_mut<UniverseStore>(STORE_ADDRESS);
        let s_index = scenario_index(&store.scenarios, scenario_id);
        let resolved_universe_id;
        let winner;
        let winning_text;
        {
            let scenario = vector::borrow_mut(&mut store.scenarios, s_index);
            assert!(scenario.phase == PHASE_REVEAL, E_WRONG_PHASE);

            winner = find_winner(&scenario.vote_counts);
            scenario.winning_choice = winner;
            scenario.phase = PHASE_RESOLVED;

            winning_text = *vector::borrow(&scenario.choices, winner as u64);
            resolved_universe_id = scenario.universe_id;
        };

        event::emit(ScenarioResolved {
            scenario_id,
            winning_choice: winner,
            winning_text,
            admin: STORE_ADDRESS,
        });

        let u_index = universe_index(&store.universes, resolved_universe_id);
        let universe = vector::borrow_mut(&mut store.universes, u_index);
        if (universe.status != STATUS_COMPLETE) {
            universe.status = STATUS_PARTIAL;
        };
    }

    public entry fun seal_universe(
        admin: &signer,
        universe_id: u64,
        final_story_hash: String,
    ) acquires UniverseStore {
        assert_admin(admin);
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);
        assert!(string::length(&final_story_hash) > 0, E_EMPTY_STORY_HASH);

        let store = borrow_global_mut<UniverseStore>(STORE_ADDRESS);
        let u_index = universe_index(&store.universes, universe_id);
        let scenario_ids;
        {
            let universe = vector::borrow(&store.universes, u_index);
            assert!(universe.status != STATUS_COMPLETE, E_UNIVERSE_ALREADY_COMPLETE);
            scenario_ids = universe.scenario_ids;
        };

        let i = 0;
        while (i < vector::length(&scenario_ids)) {
            let scenario_id = *vector::borrow(&scenario_ids, i);
            let s_index = scenario_index(&store.scenarios, scenario_id);
            let scenario = vector::borrow(&store.scenarios, s_index);
            if (scenario.phase != PHASE_RESOLVED) {
                abort E_UNIVERSE_NOT_READY_TO_SEAL
            };
            i = i + 1;
        };

        let hash_copy = copy final_story_hash;
        let universe = vector::borrow_mut(&mut store.universes, u_index);
        universe.final_story_hash = final_story_hash;
        universe.status = STATUS_COMPLETE;

        event::emit(UniverseSealed {
            universe_id,
            final_story_hash: hash_copy,
            admin: STORE_ADDRESS,
        });
    }

    #[view]
    public fun get_universe(
        universe_id: u64,
    ): (u64, String, vector<u64>, u8, String, address) acquires UniverseStore {
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);
        let store = borrow_global<UniverseStore>(STORE_ADDRESS);
        let index = universe_index(&store.universes, universe_id);
        let universe = vector::borrow(&store.universes, index);
        (
            universe.id,
            universe.headline,
            universe.scenario_ids,
            universe.status,
            universe.final_story_hash,
            universe.admin,
        )
    }

    #[view]
    public fun list_universe_scenarios(universe_id: u64): vector<u64> acquires UniverseStore {
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);
        let store = borrow_global<UniverseStore>(STORE_ADDRESS);
        let index = universe_index(&store.universes, universe_id);
        let universe = vector::borrow(&store.universes, index);
        universe.scenario_ids
    }

    #[view]
    public fun get_scenario(
        scenario_id: u64,
    ): (u64, u64, String, vector<String>, u8, u64, u8) acquires UniverseStore {
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);
        let store = borrow_global<UniverseStore>(STORE_ADDRESS);
        let index = scenario_index(&store.scenarios, scenario_id);
        let scenario = vector::borrow(&store.scenarios, index);
        (
            scenario.id,
            scenario.universe_id,
            scenario.question,
            scenario.choices,
            scenario.phase,
            scenario.total_votes,
            scenario.winning_choice,
        )
    }

    #[view]
    public fun get_vote_counts(scenario_id: u64): vector<u64> acquires UniverseStore {
        assert!(exists<UniverseStore>(STORE_ADDRESS), E_STORE_NOT_FOUND);
        let store = borrow_global<UniverseStore>(STORE_ADDRESS);
        let index = scenario_index(&store.scenarios, scenario_id);
        let scenario = vector::borrow(&store.scenarios, index);
        if (scenario.phase == PHASE_COMMIT) {
            vector[0, 0, 0, 0]
        } else {
            scenario.vote_counts
        }
    }

    #[view]
    public fun has_voted_in_scenario(voter: address, scenario_id: u64): bool acquires VoteReceipt {
        receipt_contains(voter, scenario_id)
    }

    fun assert_admin(admin: &signer) {
        assert!(signer::address_of(admin) == STORE_ADDRESS, E_NOT_ADMIN);
    }

    fun empty_string(): String {
        string::utf8(b"")
    }

    fun universe_index(universes: &vector<Universe>, universe_id: u64): u64 {
        let i = 0;
        while (i < vector::length(universes)) {
            let universe = vector::borrow(universes, i);
            if (universe.id == universe_id) {
                return i
            };
            i = i + 1;
        };

        abort E_UNIVERSE_NOT_FOUND
    }

    fun scenario_index(scenarios: &vector<Scenario>, scenario_id: u64): u64 {
        let i = 0;
        while (i < vector::length(scenarios)) {
            let scenario = vector::borrow(scenarios, i);
            if (scenario.id == scenario_id) {
                return i
            };
            i = i + 1;
        };

        abort E_SCENARIO_NOT_FOUND
    }

    fun receipt_contains(voter: address, scenario_id: u64): bool acquires VoteReceipt {
        if (!exists<VoteReceipt>(voter)) {
            return false
        };

        let receipt = borrow_global<VoteReceipt>(voter);
        let i = 0;
        while (i < vector::length(&receipt.scenario_ids)) {
            if (*vector::borrow(&receipt.scenario_ids, i) == scenario_id) {
                return true
            };
            i = i + 1;
        };
        false
    }

    fun find_winner(vote_counts: &vector<u64>): u8 {
        let i = 0;
        let winner = 0;
        let max_votes = 0;

        while (i < vector::length(vote_counts)) {
            let votes = *vector::borrow(vote_counts, i);
            if (votes > max_votes) {
                winner = i;
                max_votes = votes;
            };
            i = i + 1;
        };

        winner as u8
    }
}
