export interface AGCommand {
    name: string;
    cmd: string;
    time_limit: number;
    stack_size_limit: number;
    use_virtual_memory_limit: boolean;
    virtual_memory_limit: number;
    process_spawn_limit: number;
    block_process_spawn: boolean;
}
