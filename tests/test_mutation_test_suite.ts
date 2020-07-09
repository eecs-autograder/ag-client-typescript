import {
    AGCommand,
    BugsExposedFeedbackLevel,
    Course,
    ExpectedStudentFile,
    ID,
    InstructorFile,
    MutationTestSuite,
    MutationTestSuiteFeedbackConfig,
    MutationTestSuiteObserver,
    NewMutationTestSuiteData,
    Project,
    SandboxDockerImage,
    SandboxDockerImageData,
} from "..";

import {
    get_expected_editable_fields,
    global_setup,
    make_superuser, rand_bool, rand_int,
    reset_db,
    run_in_django_shell, sleep,
} from "./utils";

beforeAll(() => {
    global_setup();
});

let setup_command: AGCommand = {
    name: "",
    cmd: 'seeetup',
    time_limit: 9,
    stack_size_limit: 40040,
    use_virtual_memory_limit: true,
    virtual_memory_limit: 100000008,
    process_spawn_limit: 7,
    block_process_spawn: false,
};
let get_student_test_names_command = {
    name: "",
    cmd: 'ls test*',
    time_limit: 10,
    stack_size_limit: 42000,
    use_virtual_memory_limit: true,
    virtual_memory_limit: 100090000,
    process_spawn_limit: 2,
    block_process_spawn: true,
};
let student_test_validity_check_command = {
    name: "",
    cmd: 'valid.sh ${student_test_name}',
    time_limit: 11,
    stack_size_limit: 40010,
    use_virtual_memory_limit: true,
    virtual_memory_limit: 100100000,
    process_spawn_limit: 6,
    block_process_spawn: true,
};
let grade_buggy_impl_command = {
    name: "",
    cmd: 'grade.py ${student_test_name} ${buggy_impl_name}',
    time_limit: 8,
    stack_size_limit: 50000,
    use_virtual_memory_limit: true,
    virtual_memory_limit: 200000000,
    process_spawn_limit: 3,
    block_process_spawn: false,
};

describe('MutationTestSuite ctor tests', () => {
    test('Construct MutationTestSuite', () => {
        let now = (new Date()).toISOString();
        let instructor_files_needed = [
            // Should work with InstructorFileData and InstructorFile
            {
                pk: 100,
                project: 42,
                name: 'spam',
                size: 4300,
                last_modified: ''
            },
            // Should work with InstructorFileData and InstructorFile
            new InstructorFile({
                pk: 101,
                project: 42,
                name: 'spam',
                size: 4300,
                last_modified: ''
            })
        ];
        let student_files_needed = [
            // Should work with ExpectedStudentFileData and ExpectedStudentFile
            {
                pk: 300,
                project: 42,
                pattern: 'spam',
                min_num_matches: 1,
                max_num_matches: 1,
                last_modified: ''
            },
            // Should work with ExpectedStudentFileData and ExpectedStudentFile
            new ExpectedStudentFile({
                pk: 300,
                project: 42,
                pattern: 'spam',
                min_num_matches: 1,
                max_num_matches: 1,
                last_modified: ''
            })
        ];

        let sandbox_image: SandboxDockerImageData = {
            pk: 1,
            display_name: 'Image',
            last_modified: (new Date()).toISOString(),
            course: null
        };

        let normal_fdbk = make_random_fdbk_config();
        let ultimate_submission_fdbk = make_random_fdbk_config();
        let past_limit_submission_fdbk = make_random_fdbk_config();
        let staff_viewer_fdbk = make_random_fdbk_config();

        let suite = new MutationTestSuite({
            pk: 9,
            name: 'a suite',
            project: 39,

            instructor_files_needed: instructor_files_needed,
            read_only_instructor_files: false,

            student_files_needed: student_files_needed,

            buggy_impl_names: ['bug1', 'bug2'],

            use_setup_command: true,
            setup_command: setup_command,

            get_student_test_names_command: get_student_test_names_command,
            max_num_student_tests: 20,

            student_test_validity_check_command: student_test_validity_check_command,
            grade_buggy_impl_command: grade_buggy_impl_command,

            points_per_exposed_bug: "2.00",
            max_points: 30,
            deferred: true,
            sandbox_docker_image: sandbox_image,
            allow_network_access: true,

            normal_fdbk_config: normal_fdbk,
            ultimate_submission_fdbk_config: ultimate_submission_fdbk,
            past_limit_submission_fdbk_config: past_limit_submission_fdbk,
            staff_viewer_fdbk_config: staff_viewer_fdbk,

            last_modified: now
        });

        expect(suite.pk).toEqual(9);
        expect(suite.name).toEqual('a suite');
        expect(suite.project).toEqual(39);

        expect(suite.instructor_files_needed).toEqual(instructor_files_needed);
        expect(suite.read_only_instructor_files).toEqual(false);

        expect(suite.student_files_needed).toEqual(student_files_needed);

        expect(suite.buggy_impl_names).toEqual(['bug1', 'bug2']);

        expect(suite.use_setup_command).toEqual(true);
        expect(suite.setup_command).toEqual(setup_command);

        expect(suite.get_student_test_names_command).toEqual(get_student_test_names_command);
        expect(suite.max_num_student_tests).toEqual(20);

        expect(suite.student_test_validity_check_command)
            .toEqual(student_test_validity_check_command);
        expect(suite.grade_buggy_impl_command).toEqual(grade_buggy_impl_command);

        expect(suite.points_per_exposed_bug).toEqual("2.00");
        expect(suite.max_points).toEqual(30);
        expect(suite.deferred).toEqual(true);
        expect(suite.sandbox_docker_image).toEqual(sandbox_image);
        expect(suite.allow_network_access).toEqual(true);

        expect(suite.normal_fdbk_config).toEqual(normal_fdbk);
        expect(suite.ultimate_submission_fdbk_config).toEqual(ultimate_submission_fdbk);
        expect(suite.past_limit_submission_fdbk_config).toEqual(past_limit_submission_fdbk);
        expect(suite.staff_viewer_fdbk_config).toEqual(staff_viewer_fdbk);

        expect(suite.last_modified).toEqual(now);

        suite.max_points = null;
        expect(suite.max_points).toBeNull();
    });
});

class TestObserver implements MutationTestSuiteObserver {
    mutation_test_suite: MutationTestSuite | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    order: number[] | null = null;

    update_mutation_test_suite_changed(mutation_test_suite: MutationTestSuite): void {
        this.mutation_test_suite = mutation_test_suite;
        this.changed_count += 1;
    }

    update_mutation_test_suite_created(mutation_test_suite: MutationTestSuite): void {
        this.mutation_test_suite = mutation_test_suite;
        this.created_count += 1;
    }

    update_mutation_test_suite_deleted(mutation_test_suite: MutationTestSuite): void {
        this.mutation_test_suite = null;
        this.deleted_count += 1;
    }

    update_mutation_test_suites_order_changed(project_pk: number,
                                              mutation_test_suite_order: ID[]): void {
        this.order = mutation_test_suite_order;
    }
}

function make_random_fdbk_config(): MutationTestSuiteFeedbackConfig {
    return {
        visible: rand_bool(),

        show_setup_return_code: rand_bool(),
        show_setup_stdout: rand_bool(),
        show_setup_stderr: rand_bool(),

        show_invalid_test_names: rand_bool(),
        show_points: rand_bool(),
        bugs_exposed_fdbk_level: Object.values(BugsExposedFeedbackLevel)[rand_int(2)],

        show_get_test_names_return_code: rand_bool(),
        show_get_test_names_stdout: rand_bool(),
        show_get_test_names_stderr: rand_bool(),

        show_validity_check_stdout: rand_bool(),
        show_validity_check_stderr: rand_bool(),

        show_grade_buggy_impls_stdout: rand_bool(),
        show_grade_buggy_impls_stderr: rand_bool(),
    };
}

describe('MutationTestSuite API tests', () => {
    let project: Project;
    let observer: TestObserver;

    beforeEach(async () => {
        reset_db();
        make_superuser();
        let course = await Course.create({name: 'Coursey'});
        project = await Project.create(course.pk, {name: 'Projy'});

        let make_suites = `
from autograder.core.models import MutationTestSuite
MutationTestSuite.objects.validate_and_create(project=${project.pk}, name='MutationSuite1')
MutationTestSuite.objects.validate_and_create(project=${project.pk}, name='MutationSuite2')
        `;
        run_in_django_shell(make_suites);

        observer = new TestObserver();
        MutationTestSuite.subscribe(observer);
    });

    test('Get MutationTestSuites from project', async () => {
        let suites = await MutationTestSuite.get_all_from_project(project.pk);
        expect(suites[0].name).toEqual('MutationSuite1');
        expect(suites[1].name).toEqual('MutationSuite2');
    });

    test('Get MutationTestSuites from project none exist', async () => {
        let delete_suites = `
from autograder.core.models import MutationTestSuite
MutationTestSuite.objects.all().delete()
        `;
        run_in_django_shell(delete_suites);

        let suites = await MutationTestSuite.get_all_from_project(project.pk);
        expect(suites).toEqual([]);
    });

    test('Get MutationTestSuite by pk', async () => {
        let suites = await MutationTestSuite.get_all_from_project(project.pk);
        let suite = await MutationTestSuite.get_by_pk(suites[0].pk);
        expect(suite.name).toEqual('MutationSuite1');
    });

    test('Create MutationTestSuite all params', async () => {
        let instructor_file = await InstructorFile.create(project.pk, 'Filey', new Blob(['']));
        let expected_student_file = await ExpectedStudentFile.create(project.pk, {pattern: 'wee'});

        let make_sandbox_image = `
from autograder.core.models import SandboxDockerImage
image = SandboxDockerImage.objects.validate_and_create(
    name='custom', tag='jameslp/custom', display_name='Custom')

print(image.pk)
        `;
        let result = run_in_django_shell(make_sandbox_image);
        let image = await SandboxDockerImage.get_by_pk(parseInt(result.stdout, 10));

        let normal_fdbk = make_random_fdbk_config();
        let ultimate_submission_fdbk = make_random_fdbk_config();
        let past_limit_submission_fdbk = make_random_fdbk_config();
        let staff_viewer_fdbk = make_random_fdbk_config();

        let suite = await MutationTestSuite.create(
            project.pk,
            new NewMutationTestSuiteData({
                name: 'a suite',

                instructor_files_needed: [instructor_file],
                read_only_instructor_files: false,

                student_files_needed: [expected_student_file],

                buggy_impl_names: ['bug1', 'bug2'],

                use_setup_command: true,
                setup_command: setup_command,

                get_student_test_names_command: get_student_test_names_command,
                max_num_student_tests: 20,

                student_test_validity_check_command: student_test_validity_check_command,
                grade_buggy_impl_command: grade_buggy_impl_command,

                points_per_exposed_bug: "2.00",
                max_points: 30,
                deferred: true,
                sandbox_docker_image: image,
                allow_network_access: true,

                normal_fdbk_config: normal_fdbk,
                ultimate_submission_fdbk_config: ultimate_submission_fdbk,
                past_limit_submission_fdbk_config: past_limit_submission_fdbk,
                staff_viewer_fdbk_config: staff_viewer_fdbk,
            })
        );

        expect(suite.name).toEqual('a suite');

        expect(suite.instructor_files_needed).toEqual([instructor_file]);
        expect(suite.read_only_instructor_files).toEqual(false);

        expect(suite.student_files_needed).toEqual([expected_student_file]);

        expect(suite.buggy_impl_names).toEqual(['bug1', 'bug2']);

        expect(suite.use_setup_command).toEqual(true);
        expect(suite.setup_command).toEqual(setup_command);

        expect(suite.get_student_test_names_command).toEqual(get_student_test_names_command);
        expect(suite.max_num_student_tests).toEqual(20);

        expect(suite.student_test_validity_check_command)
            .toEqual(student_test_validity_check_command);
        expect(suite.grade_buggy_impl_command).toEqual(grade_buggy_impl_command);

        expect(suite.points_per_exposed_bug).toEqual("2.00");
        expect(suite.max_points).toEqual(30);
        expect(suite.deferred).toEqual(true);
        expect(suite.sandbox_docker_image).toEqual(image);
        expect(suite.allow_network_access).toEqual(true);

        expect(suite.normal_fdbk_config).toEqual(normal_fdbk);
        expect(suite.ultimate_submission_fdbk_config).toEqual(ultimate_submission_fdbk);
        expect(suite.past_limit_submission_fdbk_config).toEqual(past_limit_submission_fdbk);
        expect(suite.staff_viewer_fdbk_config).toEqual(staff_viewer_fdbk);

        expect(observer.mutation_test_suite).toEqual(suite);
        expect(observer.created_count).toEqual(1);
    });

    test('Create MutationTestSuite only required params', async () => {
        let suite = await MutationTestSuite.create(project.pk, {name: 'New Suite'});
        expect(suite.name).toEqual('New Suite');
        expect(suite.project).toEqual(project.pk);

        let suites = await MutationTestSuite.get_all_from_project(project.pk);
        expect(suites.length).toEqual(3);
    });

    test('Save MutationTestSuite', async () => {
        let suite = (await MutationTestSuite.get_all_from_project(project.pk))[0];
        suite.name = 'Renamed';
        suite.setup_command.cmd = './compile.exe';
        await suite.save();
        expect(suite.name).toEqual('Renamed');
        expect(suite.setup_command.cmd).toEqual('./compile.exe');

        let reloaded = await MutationTestSuite.get_by_pk(suite.pk);
        expect(reloaded.name).toEqual('Renamed');
        expect(suite.setup_command.cmd).toEqual('./compile.exe');

        expect(observer.mutation_test_suite).toEqual(suite);
        expect(observer.changed_count).toEqual(1);
    });

    test('Check editable flields', async () => {
        let expected = get_expected_editable_fields('MutationTestSuite');
        expected =  expected.filter((value) => value !== 'docker_image_to_use');
        expected.sort();

        expect(MutationTestSuite.EDITABLE_FIELDS.slice().sort()).toEqual(expected);
    });

    test('Refresh MutationTestSuite', async () => {
        let suite = (await MutationTestSuite.get_all_from_project(project.pk))[0];

        await suite.refresh();
        expect(observer.changed_count).toEqual(0);

        await sleep(1);

        let rename_suite = `
from autograder.core.models import MutationTestSuite
MutationTestSuite.objects.get(pk=${suite.pk}).validate_and_update(name='Renamed')
        `;
        run_in_django_shell(rename_suite);

        await suite.refresh();
        expect(suite.name).toEqual('Renamed');

        expect(observer.mutation_test_suite).toEqual(suite);
        expect(observer.changed_count).toEqual(1);
    });

    test('Delete MutationTestSuite', async () => {
        let suites = await MutationTestSuite.get_all_from_project(project.pk);
        expect(suites.length).toEqual(2);

        await suites[0].delete();

        suites = await MutationTestSuite.get_all_from_project(project.pk);
        expect(suites.length).toEqual(1);
        expect(observer.mutation_test_suite).toBeNull();
        expect(observer.deleted_count).toEqual(1);
    });

    test('Unsibscribe', async () => {
        let suites = await MutationTestSuite.get_all_from_project(project.pk);
        let suite = suites[0];

        await suite.save();
        expect(observer.changed_count).toEqual(1);

        MutationTestSuite.unsubscribe(observer);

        await suite.save();
        expect(observer.changed_count).toEqual(1);
    });

    test('Get MutationTestSuite order', async () => {
        let suites = await MutationTestSuite.get_all_from_project(project.pk);

        let order = await MutationTestSuite.get_order(project.pk);
        expect(order).toEqual([suites[0].pk, suites[1].pk]);
    });

    test('Update MutationTestSuite order', async () => {
        let suites = await MutationTestSuite.get_all_from_project(project.pk);
        await MutationTestSuite.update_order(project.pk, [suites[1].pk, suites[0].pk]);

        let order = await MutationTestSuite.get_order(project.pk);
        expect(order).toEqual([suites[1].pk, suites[0].pk]);
    });
});
