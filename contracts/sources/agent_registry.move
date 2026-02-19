/// AgentRegistry — starter module for Open Claw Hackathon
/// Stores on-chain agent metadata that a frontend AI agent can read/write.
module move_hackathon::agent_registry {
    use std::string::String;
    use std::signer;
    use aptos_framework::event;

    // ────────────────────────────────────────────────────────────────────────
    // Resources
    // ────────────────────────────────────────────────────────────────────────

    struct AgentProfile has key {
        name: String,
        description: String,
        tasks_completed: u64,
    }

    // ────────────────────────────────────────────────────────────────────────
    // Events
    // ────────────────────────────────────────────────────────────────────────

    #[event]
    struct AgentRegistered has drop, store {
        owner: address,
        name: String,
    }

    #[event]
    struct TaskCompleted has drop, store {
        owner: address,
        tasks_completed: u64,
    }

    // ────────────────────────────────────────────────────────────────────────
    // Errors
    // ────────────────────────────────────────────────────────────────────────

    const E_ALREADY_REGISTERED: u64 = 1;
    const E_NOT_REGISTERED: u64 = 2;

    // ────────────────────────────────────────────────────────────────────────
    // Entry functions
    // ────────────────────────────────────────────────────────────────────────

    public entry fun register(
        account: &signer,
        name: String,
        description: String,
    ) {
        let owner = signer::address_of(account);
        assert!(!exists<AgentProfile>(owner), E_ALREADY_REGISTERED);

        event::emit(AgentRegistered { owner, name: copy name });

        move_to(account, AgentProfile {
            name,
            description,
            tasks_completed: 0,
        });
    }

    public entry fun record_task(account: &signer) acquires AgentProfile {
        let owner = signer::address_of(account);
        assert!(exists<AgentProfile>(owner), E_NOT_REGISTERED);

        let profile = borrow_global_mut<AgentProfile>(owner);
        profile.tasks_completed = profile.tasks_completed + 1;

        event::emit(TaskCompleted { owner, tasks_completed: profile.tasks_completed });
    }

    // ────────────────────────────────────────────────────────────────────────
    // View functions
    // ────────────────────────────────────────────────────────────────────────

    #[view]
    public fun get_profile(owner: address): (String, String, u64) acquires AgentProfile {
        assert!(exists<AgentProfile>(owner), E_NOT_REGISTERED);
        let p = borrow_global<AgentProfile>(owner);
        (p.name, p.description, p.tasks_completed)
    }

    #[view]
    public fun is_registered(owner: address): bool {
        exists<AgentProfile>(owner)
    }
}
