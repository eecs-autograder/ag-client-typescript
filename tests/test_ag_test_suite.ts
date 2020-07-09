import {
    AGTestCase,
    AGTestCaseFeedbackConfig,

    AGTestSuite,
    AGTestSuiteFeedbackConfig,
    AGTestSuiteObserver,

    Course,
    ExpectedStudentFile,
    InstructorFile,
    NewAGTestSuiteData,
    Project,
    SandboxDockerImage,
    SandboxDockerImageData,
} from "..";

import {
    get_expected_editable_fields,
    global_setup,
    make_superuser,
    rand_bool,
    reset_db,
    run_in_django_shell, sleep
} from "./utils";

beforeAll(() => {
    global_setup();
});

beforeEach(() => {
    reset_db();
    make_superuser();
});

describe('AGTestSuite ctor tests', () => {
    let ag_test_case_fdbk_config: AGTestCaseFeedbackConfig = {
      visible: true,
      show_individual_commands: false
    };

    let ag_test_suite_fdbk_config = {
        visible: true,
        show_individual_tests: false,

        show_setup_return_code: true,
        show_setup_timed_out: true,

        show_setup_stdout: false,
        show_setup_stderr: true,
    };

    let sandbox_image: SandboxDockerImageData = {
        pk: 1,
        display_name: 'Image',
        course: null,
        last_modified: (new Date()).toISOString()
    };

    test('Construct AGTestSuite', () => {
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

        let ag_test_cases = [
            // Should work with AGTestCaseData and AGTestCase
            {
                pk: 10,
                name: 'casey',
                ag_test_suite: 23,
                normal_fdbk_config: ag_test_case_fdbk_config,
                ultimate_submission_fdbk_config: ag_test_case_fdbk_config,
                past_limit_submission_fdbk_config: ag_test_case_fdbk_config,
                staff_viewer_fdbk_config: ag_test_case_fdbk_config,

                ag_test_commands: [],

                last_modified: now,

                _ag_test_case_data_brand: null,
            },
            // Should work with AGTestCaseData and AGTestCase
            new AGTestCase({
                pk: 10,
                name: 'casey',
                ag_test_suite: 23,
                normal_fdbk_config: ag_test_case_fdbk_config,
                ultimate_submission_fdbk_config: ag_test_case_fdbk_config,
                past_limit_submission_fdbk_config: ag_test_case_fdbk_config,
                staff_viewer_fdbk_config: ag_test_case_fdbk_config,

                ag_test_commands: [],

                last_modified: now
            })
        ];

        let ag_test_suite = new AGTestSuite({
            pk: 9,
            name: 'suitey',
            project: 8,
            last_modified: now,

            read_only_instructor_files: false,

            setup_suite_cmd: 'echo "hello"',
            setup_suite_cmd_name: 'Setty',

            sandbox_docker_image: sandbox_image,

            allow_network_access: false,
            deferred: false,

            normal_fdbk_config: ag_test_suite_fdbk_config,
            ultimate_submission_fdbk_config: ag_test_suite_fdbk_config,
            past_limit_submission_fdbk_config: ag_test_suite_fdbk_config,
            staff_viewer_fdbk_config: ag_test_suite_fdbk_config,

            instructor_files_needed: instructor_files_needed,
            student_files_needed: student_files_needed,

            ag_test_cases: ag_test_cases
        });

        expect(ag_test_suite.pk).toEqual(9);
        expect(ag_test_suite.name).toEqual('suitey');
        expect(ag_test_suite.project).toEqual(8);
        expect(ag_test_suite.last_modified).toEqual(now);

        expect(ag_test_suite.read_only_instructor_files).toEqual(false);

        expect(ag_test_suite.setup_suite_cmd).toEqual('echo "hello"');
        expect(ag_test_suite.setup_suite_cmd_name).toEqual('Setty');

        expect(ag_test_suite.sandbox_docker_image).toEqual(sandbox_image);

        expect(ag_test_suite.allow_network_access).toEqual(false);
        expect(ag_test_suite.deferred).toEqual(false);

        expect(ag_test_suite.normal_fdbk_config).toEqual(ag_test_suite_fdbk_config);
        expect(ag_test_suite.ultimate_submission_fdbk_config).toEqual(ag_test_suite_fdbk_config);
        expect(ag_test_suite.past_limit_submission_fdbk_config).toEqual(ag_test_suite_fdbk_config);
        expect(ag_test_suite.staff_viewer_fdbk_config).toEqual(ag_test_suite_fdbk_config);

        expect(ag_test_suite.instructor_files_needed).toEqual(
            [new InstructorFile(instructor_files_needed[0]), instructor_files_needed[1]]);

        expect(ag_test_suite.student_files_needed).toEqual(
            [new ExpectedStudentFile(student_files_needed[0]), student_files_needed[1]]);

        expect(ag_test_suite.ag_test_cases).toEqual(
            [new AGTestCase(ag_test_cases[0]), ag_test_cases[1]]);
    });
});

class TestObserver implements AGTestSuiteObserver {
    suite: AGTestSuite | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    order: number[] | null = null;

    update_ag_test_suite_changed(ag_test_suite: AGTestSuite): void {
        this.changed_count += 1;
        this.suite = ag_test_suite;
    }

    update_ag_test_suite_created(ag_test_suite: AGTestSuite): void {
        this.created_count += 1;
        this.suite = ag_test_suite;
    }

    update_ag_test_suite_deleted(ag_test_suite: AGTestSuite): void {
        this.deleted_count += 1;
        this.suite = null;
    }

    update_ag_test_suites_order_changed(project_pk: number, ag_test_suite_order: number[]): void {
        this.order = ag_test_suite_order;
    }
}

function make_random_feedback_config(): AGTestSuiteFeedbackConfig {
    return {
        visible: rand_bool(),
        show_individual_tests: rand_bool(),
        show_setup_return_code: rand_bool(),
        show_setup_timed_out: rand_bool(),
        show_setup_stdout: rand_bool(),
        show_setup_stderr: rand_bool(),
    };
}

describe('AGTestSuite API tests', () => {
    let project: Project;
    let observer: TestObserver;

    beforeEach(async () => {
       let course = await Course.create({name: 'Coursey'});
       project = await Project.create(course.pk, {name: 'Projy'});

       let make_suites = `
from autograder.core.models import AGTestSuite
AGTestSuite.objects.validate_and_create(project=${project.pk}, name='Suite1')
AGTestSuite.objects.validate_and_create(project=${project.pk}, name='Suite2')
       `;
       run_in_django_shell(make_suites);

       observer = new TestObserver();
       AGTestSuite.subscribe(observer);
    });

    test('Get AG test suites from project', async () => {
        let suites = await AGTestSuite.get_all_from_project(project.pk);
        expect(suites[0].name).toEqual('Suite1');
        expect(suites[1].name).toEqual('Suite2');
    });

    test('Get AG test suites from project none exist', async () => {
        let delete_suites = `
from autograder.core.models import AGTestSuite
AGTestSuite.objects.all().delete()
        `;
        run_in_django_shell(delete_suites);

        let suites = await AGTestSuite.get_all_from_project(project.pk);
        expect(suites).toEqual([]);
    });

    test('Get AG test suite by pk', async () => {
        let suites = await AGTestSuite.get_all_from_project(project.pk);
        let suite = await AGTestSuite.get_by_pk(suites[0].pk);
        expect(suite.name).toEqual('Suite1');
    });

    test('Create AG test suite all params', async () => {
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

        let normal_fdbk = make_random_feedback_config();
        let ultimate_submission_fdbk = make_random_feedback_config();
        let past_limit_submission_fdbk = make_random_feedback_config();
        let staff_viewer_fdbk = make_random_feedback_config();
        let suite = await AGTestSuite.create(
            project.pk,
            new NewAGTestSuiteData({
                name: 'A suite',
                instructor_files_needed: [instructor_file],
                student_files_needed: [expected_student_file],
                read_only_instructor_files: false,
                setup_suite_cmd: './run.exe',
                setup_suite_cmd_name: 'Run',
                sandbox_docker_image: image,
                allow_network_access: true,
                deferred: true,
                normal_fdbk_config: normal_fdbk,
                ultimate_submission_fdbk_config: ultimate_submission_fdbk,
                past_limit_submission_fdbk_config: past_limit_submission_fdbk,
                staff_viewer_fdbk_config: staff_viewer_fdbk,
            })
        );

        expect(suite.name).toEqual('A suite');
        expect(suite.project).toEqual(project.pk);

        expect(suite.read_only_instructor_files).toEqual(false);

        expect(suite.setup_suite_cmd).toEqual('./run.exe');
        expect(suite.setup_suite_cmd_name).toEqual('Run');

        expect(suite.sandbox_docker_image).toEqual(image);

        expect(suite.allow_network_access).toEqual(true);
        expect(suite.deferred).toEqual(true);

        expect(suite.normal_fdbk_config).toEqual(normal_fdbk);
        expect(suite.ultimate_submission_fdbk_config).toEqual(ultimate_submission_fdbk);
        expect(suite.past_limit_submission_fdbk_config).toEqual(past_limit_submission_fdbk);
        expect(suite.staff_viewer_fdbk_config).toEqual(staff_viewer_fdbk);

        expect(suite.instructor_files_needed).toEqual([instructor_file]);

        expect(suite.student_files_needed).toEqual([expected_student_file]);

        expect(suite.ag_test_cases).toEqual([]);

        expect(observer.suite).toEqual(suite);
        expect(observer.created_count).toEqual(1);
    });

    test('Create AG test suite only required params', async () => {
        let suite = await AGTestSuite.create(project.pk, {name: 'New Suite'});
        expect(suite.name).toEqual('New Suite');
        expect(suite.project).toEqual(project.pk);

        let suites = await AGTestSuite.get_all_from_project(project.pk);
        expect(suites.length).toEqual(3);
    });

    test('Save AG test suite', async () => {
        let suite = (await AGTestSuite.get_all_from_project(project.pk))[0];
        suite.name = 'Renamed';
        suite.setup_suite_cmd = './compile.exe';
        await suite.save();
        expect(suite.name).toEqual('Renamed');
        expect(suite.setup_suite_cmd).toEqual('./compile.exe');

        let reloaded = await AGTestSuite.get_by_pk(suite.pk);
        expect(reloaded.name).toEqual('Renamed');
        expect(reloaded.setup_suite_cmd).toEqual('./compile.exe');

        expect(observer.suite).toEqual(suite);
        expect(observer.changed_count).toEqual(1);
    });

    test('Check editable fields', async () => {
        let expected = get_expected_editable_fields('AGTestSuite');
        expected =  expected.filter((value) => value !== 'docker_image_to_use');
        expected.sort();

        expect(AGTestSuite.EDITABLE_FIELDS.slice().sort()).toEqual(expected);
    });

    test('Refresh AG test suite', async () => {
        let suite = (await AGTestSuite.get_all_from_project(project.pk))[0];

        await suite.refresh();
        expect(observer.changed_count).toEqual(0);

        await sleep(1);

        let rename_suite = `
from autograder.core.models import AGTestSuite
AGTestSuite.objects.get(pk=${suite.pk}).validate_and_update(name='Renamed')
        `;
        run_in_django_shell(rename_suite);

        await suite.refresh();
        expect(suite.name).toEqual('Renamed');

        expect(observer.suite).toEqual(suite);
        expect(observer.changed_count).toEqual(1);
    });

    test('Delete AG test suite', async () => {
        let suites = await AGTestSuite.get_all_from_project(project.pk);
        expect(suites.length).toEqual(2);

        await suites[0].delete();

        suites = await AGTestSuite.get_all_from_project(project.pk);
        expect(suites.length).toEqual(1);
        expect(observer.suite).toBeNull();
        expect(observer.deleted_count).toEqual(1);
    });

    test('Unsubscribe', async () => {
        let suites = await AGTestSuite.get_all_from_project(project.pk);
        let suite = suites[0];

        await suite.save();
        expect(observer.changed_count).toEqual(1);

        AGTestSuite.unsubscribe(observer);

        await suite.save();
        expect(observer.changed_count).toEqual(1);
    });

    test('Get AG test suite order', async () => {
        let suites = await AGTestSuite.get_all_from_project(project.pk);

        let order = await AGTestSuite.get_order(project.pk);
        expect(order).toEqual([suites[0].pk, suites[1].pk]);
    });

    test('Update AG test suite order', async () => {
        let suites = await AGTestSuite.get_all_from_project(project.pk);
        await AGTestSuite.update_order(project.pk, [suites[1].pk, suites[0].pk]);

        let order = await AGTestSuite.get_order(project.pk);
        expect(order).toEqual([suites[1].pk, suites[0].pk]);
    });
});
