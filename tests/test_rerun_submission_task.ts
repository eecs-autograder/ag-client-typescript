import { Course } from '../src/course';
import { Project } from '../src/project';
import { NewRerunSubmissionTaskData, RerunSubmissionTask } from '../src/rerun_submission_task';

import { global_setup, make_superuser, reset_db } from './utils';

beforeAll(() => {
    global_setup();
});

let project: Project;

beforeEach(async () => {
    reset_db();
    make_superuser();
    let course = await Course.create({name: 'Coursey'});
    project = await Project.create(course.pk, {name: 'Projy'});
});

test('Task ctor', () => {
    let now = (new Date()).toISOString();
    let task = new RerunSubmissionTask({
        pk: 4,
        project: 8,

        progress: 58,
        is_cancelled: true,
        error_msg: 'WAAAAA',

        created_at: now,
        has_error: true,

        rerun_all_submissions: true,
        submission_pks: [],
        rerun_all_ag_test_suites: false,
        ag_test_suite_data: {8: [1]},
        rerun_all_mutation_test_suites: true,
        mutation_suite_pks: [5, 8, 9],
    });

    expect(task.pk).toEqual(4);
    expect(task.project).toEqual(8);

    expect(task.progress).toEqual(58);
    expect(task.is_cancelled).toBe(true);
    expect(task.error_msg).toEqual('WAAAAA');

    expect(task.created_at).toEqual(now);
    expect(task.has_error).toBe(true);

    expect(task.rerun_all_submissions).toBe(true);
    expect(task.submission_pks).toEqual([]);
    expect(task.rerun_all_ag_test_suites).toBe(false);
    expect(task.ag_test_suite_data).toEqual({8: [1]});
    expect(task.rerun_all_mutation_test_suites).toBe(true);
    expect(task.mutation_suite_pks).toEqual([5, 8, 9]);
});

test('NewRerunSubmissionTaskData ctor', () => {
    let data = new NewRerunSubmissionTaskData({
        rerun_all_submissions: true,
        submission_pks: [1, 3],

        rerun_all_ag_test_suites: false,
        ag_test_suite_data: {42: [3, 4]},

        rerun_all_mutation_test_suites: false,
        mutation_suite_pks: [6, 8],
    });

    expect(data.rerun_all_submissions).toBe(true);
    expect(data.submission_pks).toEqual([1, 3]);

    expect(data.rerun_all_ag_test_suites).toBe(false);
    expect(data.ag_test_suite_data).toEqual({42: [3, 4]});

    expect(data.rerun_all_mutation_test_suites).toBe(false);
    expect(data.mutation_suite_pks).toEqual([6, 8]);
});

test('Create and get task', async () => {
    let task = await RerunSubmissionTask.create(project.pk, {
        rerun_all_submissions: false,
        submission_pks: [],
        rerun_all_ag_test_suites: false,
        ag_test_suite_data: {},
        rerun_all_mutation_test_suites: false,
        mutation_suite_pks: [],
    });

    expect(task.rerun_all_submissions).toBe(false);
    expect(task.submission_pks).toEqual([]);
    expect(task.rerun_all_ag_test_suites).toBe(false);
    expect(task.ag_test_suite_data).toEqual({});
    expect(task.rerun_all_mutation_test_suites).toBe(false);
    expect(task.mutation_suite_pks).toEqual([]);

    expect(task.project).toEqual(project.pk);
    expect(task.progress).toEqual(100);
    expect(task.error_msg).toEqual('');
    expect(task.has_error).toEqual(false);

    let loaded = await RerunSubmissionTask.get_by_pk(task.pk);
    expect(loaded).toEqual(task);
});

test('Cancel task', async () => {
    let task = await RerunSubmissionTask.create(project.pk, {
        rerun_all_submissions: false,
        submission_pks: [],
        rerun_all_ag_test_suites: false,
        ag_test_suite_data: {},
        rerun_all_mutation_test_suites: false,
        mutation_suite_pks: [],
    });
    expect(task.is_cancelled).toBe(false);

    await task.cancel();
    task = await RerunSubmissionTask.get_by_pk(task.pk);
    expect(task.is_cancelled).toBe(true);
});

test('Get all from project', async () => {
    let task_1 = await RerunSubmissionTask.create(project.pk, {});
    let task_2 = await RerunSubmissionTask.create(project.pk, {
        rerun_all_submissions: true,
        rerun_all_ag_test_suites: true,
        rerun_all_mutation_test_suites: true,
    });

    let loaded = await RerunSubmissionTask.get_all_from_project(project.pk);
    expect(loaded).toEqual([task_2, task_1]);
});
