/// outcome.fi MVP contract for one blind-vote scenario.
module move_hackathon::outcome_fi {
    use std::string::String;
    use std::signer;
    use std::vector;
    use aptos_framework::event;

    const PHASE_COMMIT: u8 = 0;
    const PHASE_REVEAL: u8 = 1;
    const PHASE_RESOLVED: u8 = 2;
    const NO_WINNER: u8 = 255;

    const E_SCENARIO_ALREADY_EXISTS: u64 = 1;
    const E_SCENARIO_NOT_FOUND: u64 = 2;
    const E_INVALID_CHOICE: u64 = 3;
    const E_ALREADY_VOTED: u64 = 4;
    const E_WRONG_PHASE: u64 = 5;
    const E_NOT_ADMIN: u64 = 6;
    const E_NOT_REVEAL_PHASE: u64 = 7;

    struct Scenario has key {
        question: String,
        choices: vector<String>,
        phase: u8,
        vote_counts: vector<u64>,
        total_votes: u64,
        winning_choice: u8,
        admin: address,
    }

    struct VoteReceipt has key {
        choice: u8,
    }

    #[event]
    struct VoteCast has drop, store {
        voter: address,
        choice: u8,
        total_votes: u64,
    }

    #[event]
    struct PhaseAdvanced has drop, store {
        admin: address,
        new_phase: u8,
    }

    #[event]
    struct TimelineResolved has drop, store {
        admin: address,
        winning_choice: u8,
        winning_text: String,
    }

    public entry fun initialize(
        admin: &signer,
        question: String,
        choice_a: String,
        choice_b: String,
        choice_c: String,
        choice_d: String,
    ) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<Scenario>(admin_addr), E_SCENARIO_ALREADY_EXISTS);

        let choices = vector::empty<String>();
        vector::push_back(&mut choices, choice_a);
        vector::push_back(&mut choices, choice_b);
        vector::push_back(&mut choices, choice_c);
        vector::push_back(&mut choices, choice_d);

        let vote_counts = vector::empty<u64>();
        vector::push_back(&mut vote_counts, 0);
        vector::push_back(&mut vote_counts, 0);
        vector::push_back(&mut vote_counts, 0);
        vector::push_back(&mut vote_counts, 0);

        move_to(
            admin,
            Scenario {
                question,
                choices,
                phase: PHASE_COMMIT,
                vote_counts,
                total_votes: 0,
                winning_choice: NO_WINNER,
                admin: admin_addr,
            },
        );
    }

    public entry fun vote(voter: &signer, scenario_addr: address, choice: u8) acquires Scenario {
        assert!(choice < 4, E_INVALID_CHOICE);
        let voter_addr = signer::address_of(voter);
        assert!(!exists<VoteReceipt>(voter_addr), E_ALREADY_VOTED);

        assert!(exists<Scenario>(scenario_addr), E_SCENARIO_NOT_FOUND);
        let scenario = borrow_global_mut<Scenario>(scenario_addr);
        assert!(scenario.phase == PHASE_COMMIT, E_WRONG_PHASE);

        let vote_count = vector::borrow_mut(&mut scenario.vote_counts, choice as u64);
        *vote_count = *vote_count + 1;
        scenario.total_votes = scenario.total_votes + 1;

        event::emit(VoteCast {
            voter: voter_addr,
            choice,
            total_votes: scenario.total_votes,
        });

        move_to(voter, VoteReceipt { choice });
    }

    public entry fun advance_phase(admin: &signer, scenario_addr: address) acquires Scenario {
        assert!(exists<Scenario>(scenario_addr), E_SCENARIO_NOT_FOUND);
        let admin_addr = signer::address_of(admin);
        let scenario = borrow_global_mut<Scenario>(scenario_addr);
        assert!(admin_addr == scenario.admin, E_NOT_ADMIN);
        assert!(scenario.phase == PHASE_COMMIT, E_WRONG_PHASE);

        scenario.phase = PHASE_REVEAL;
        event::emit(PhaseAdvanced {
            admin: admin_addr,
            new_phase: scenario.phase,
        });
    }

    public entry fun resolve(admin: &signer, scenario_addr: address) acquires Scenario {
        assert!(exists<Scenario>(scenario_addr), E_SCENARIO_NOT_FOUND);
        let admin_addr = signer::address_of(admin);
        let scenario = borrow_global_mut<Scenario>(scenario_addr);

        assert!(admin_addr == scenario.admin, E_NOT_ADMIN);
        assert!(scenario.phase == PHASE_REVEAL, E_NOT_REVEAL_PHASE);

        let winner_index = find_winner(&scenario.vote_counts);
        scenario.winning_choice = winner_index;
        scenario.phase = PHASE_RESOLVED;

        let winner_text = *vector::borrow(&scenario.choices, winner_index as u64);
        event::emit(TimelineResolved {
            admin: admin_addr,
            winning_choice: winner_index,
            winning_text: winner_text,
        });
    }

    fun find_winner(vote_counts: &vector<u64>): u8 {
        let i = 0;
        let winner = 0;
        let winner_votes = 0;
        while (i < vector::length(vote_counts)) {
            let candidate_votes = *vector::borrow(vote_counts, i);
            if (candidate_votes > winner_votes) {
                winner = i;
                winner_votes = candidate_votes;
            };
            i = i + 1;
        };

        winner as u8
    }

    #[view]
    public fun get_scenario(scenario_addr: address): (String, vector<String>, u8, u64) acquires Scenario {
        assert!(exists<Scenario>(scenario_addr), E_SCENARIO_NOT_FOUND);
        let scenario = borrow_global<Scenario>(scenario_addr);
        (
            scenario.question,
            scenario.choices,
            scenario.phase,
            scenario.total_votes,
        )
    }

    #[view]
    public fun get_vote_counts(scenario_addr: address): vector<u64> acquires Scenario {
        assert!(exists<Scenario>(scenario_addr), E_SCENARIO_NOT_FOUND);
        let scenario = borrow_global<Scenario>(scenario_addr);
        if (scenario.phase == PHASE_COMMIT) {
            vector[0, 0, 0, 0]
        } else {
            scenario.vote_counts
        }
    }

    #[view]
    public fun has_voted(voter: address): bool {
        exists<VoteReceipt>(voter)
    }

    #[view]
    public fun get_winner(scenario_addr: address): u8 acquires Scenario {
        assert!(exists<Scenario>(scenario_addr), E_SCENARIO_NOT_FOUND);
        let scenario = borrow_global<Scenario>(scenario_addr);
        scenario.winning_choice
    }
}
