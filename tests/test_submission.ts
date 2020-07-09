import {
    Course,
    ExpectedStudentFile,
    FeedbackCategory,
    GradingStatus,
    Group,
    Project,
    Submission,
    SubmissionObserver,
    UltimateSubmissionPolicy,
} from "..";

import {
    blob_to_string,
    check_tar_file,
    do_editable_fields_test,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
    sleep,
    SUPERUSER_NAME,
} from "./utils";

beforeAll(() => {
    global_setup();
});

let group: Group;
let project: Project;

beforeEach(async () => {
    reset_db();
    make_superuser();
    let course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project'});
    await ExpectedStudentFile.create(project.pk, {pattern: '*', max_num_matches: 10});
    group = await Group.create_solo_group(project.pk);
});


describe('Submission ctor tests', () => {
    test('Submission ctor', () => {
        let now = new Date().toISOString();

        let submission = new Submission({
            pk: 5,
            group: 7,

            timestamp: now,
            submitter: 'batman',

            submitted_filenames: ['spam', 'egg'],
            discarded_files: ['very', 'nope'],
            missing_files: {'oops': 1, '*.cpp': 3},

            status: GradingStatus.being_graded,

            is_past_daily_limit: false,
            is_bonus_submission: true,
            count_towards_total_limit: true,

            does_not_count_for: ['robin'],

            position_in_queue: 3,

            last_modified: now,
        });

        expect(submission.pk).toEqual(5);
        expect(submission.group).toEqual(7);

        expect(submission.timestamp).toEqual(now);
        expect(submission.submitter).toEqual('batman');

        expect(submission.submitted_filenames).toEqual(['spam', 'egg']);
        expect(submission.discarded_files).toEqual(['very', 'nope']);
        expect(submission.missing_files).toEqual({'oops': 1, '*.cpp': 3});

        expect(submission.status).toEqual(GradingStatus.being_graded);

        expect(submission.is_past_daily_limit).toEqual(false);
        expect(submission.is_bonus_submission).toEqual(true);
        expect(submission.count_towards_total_limit).toEqual(true);

        expect(submission.does_not_count_for).toEqual(['robin']);

        expect(submission.position_in_queue).toEqual(3);

        expect(submission.last_modified).toEqual(now);
    });
});

class TestObserver implements SubmissionObserver {
    submission: Submission | null = null;
    created_count = 0;
    changed_count = 0;

    update_submission_changed(submission: Submission): void {
        this.changed_count += 1;
        this.submission = submission;
    }

    update_submission_created(submission: Submission): void {
        this.submission = submission;
        this.created_count += 1;
    }
}

describe('Submission list/create tests', () => {
    test('Get submissions from group', async () => {
        let make_submissions = `
from autograder.core.models import Group, Submission

group = Group.objects.get(pk=${group.pk})

for i in range(3):
    s = Submission.objects.validate_and_create([], group)
    s.status = Submission.GradingStatus.finished_grading
    s.save()
        `;
        run_in_django_shell(make_submissions);

        let submissions = await Submission.get_all_from_group(group.pk);
        expect(submissions.length).toEqual(3);
    });

    test('Get submissions from group list empty', async () => {
        let submissions = await Submission.get_all_from_group(group.pk);
        expect(submissions.length).toEqual(0);
    });

    test('Create submission', async () => {
        let observer = new TestObserver();
        Submission.subscribe(observer);

        let files = [
            new File(['content1'], 'file1'),
            new File(['content2'], 'file2'),
            new File(['content3'], 'file3'),
        ];

        let submission = await Submission.create(group.pk, files);
        expect(submission.submitter).toEqual(SUPERUSER_NAME);
        expect(submission.submitted_filenames).toEqual(['file1', 'file2', 'file3']);

        expect(observer.created_count).toEqual(1);
        expect(observer.submission).toEqual(submission);
    });
});

describe('Submission detail endpoint tests', () => {
    let submission: Submission;
    let observer: TestObserver;

    beforeEach(async () => {
        let files = [
            new File(['content1'], 'file1'),
            new File(['content2'], 'file2'),
            new File(['content3'], 'file3'),
        ];

        submission = await Submission.create(group.pk, files);

        observer = new TestObserver();
        Submission.subscribe(observer);
    });

    test('Admin edit submission', async () => {
        expect(submission.count_towards_total_limit).toEqual(true);
        submission.count_towards_total_limit = false;
        await submission.save();

        let loaded = await Submission.get_by_pk(submission.pk);
        expect(loaded.count_towards_total_limit).toEqual(false);

        expect(observer.submission).toEqual(submission);
        expect(observer.changed_count).toEqual(1);
    });

    test('Remove submission from queue', async () => {
        expect(submission.status).toEqual(GradingStatus.received);

        await submission.remove_from_queue();

        expect(submission.status).toEqual(GradingStatus.removed_from_queue);

        expect(observer.submission).toEqual(submission);
        expect(observer.changed_count).toEqual(1);
    });

    test('Get submitted file content', async () => {
        let content = await submission.get_file_content('file2');
        expect(await blob_to_string(content)).toEqual('content2');
    });

    test('Get submitted file tarball', async () => {
        let make_tarball = `
import tarfile
import tempfile

from autograder.core.models import Submission

s = Submission.objects.get(pk=${submission.pk})

with s.get_file('file1', 'wb') as to_overwrite:
    with tarfile.open(fileobj=to_overwrite, mode='w|gz') as tar:
        with tempfile.TemporaryFile() as f:
            f.write(b'I am file')
            f.seek(0)

            tar.addfile(tarfile.TarInfo('tar_file1'), f)

        with tempfile.TemporaryFile() as f:
            f.write(b'I am also file')
            f.seek(0)

            tar.addfile(tarfile.TarInfo('tar_file2'), f)
        `;

        run_in_django_shell(make_tarball);

        let response = await submission.get_file_content('file1');
        return check_tar_file(response, ['tar_file1', 'tar_file2']);
    });

    test('Refresh', async () => {
        expect(submission.status).toEqual(GradingStatus.received);

        let update_submission = `
from autograder.core.models import Submission

s = Submission.objects.get(pk=${submission.pk})
s.status = Submission.GradingStatus.being_graded
s.save()
        `;

        await sleep(1);

        run_in_django_shell(update_submission);

        await submission.refresh();

        expect(observer.submission).toEqual(submission);
        expect(observer.changed_count).toEqual(1);
    });

    test('Unsubscribe', async () => {
        await submission.save();
        expect(observer.changed_count).toEqual(1);

        Submission.unsubscribe(observer);

        await submission.save();
        expect(observer.changed_count).toEqual(1);
    });

    test('Editable fields', () => {
        do_editable_fields_test(Submission, 'Submission');
    });
});

describe('Get final graded submission tests', () => {
    let best: Submission;
    let most_recent: Submission;

    beforeEach(async () => {
        let make_tests = `
from autograder.core.models import Project
import autograder.utils.testing.model_obj_builders as obj_build

obj_build.make_full_ag_test_command(
    obj_build.make_ag_test_case(
        obj_build.make_ag_test_suite(
            Project.objects.get(pk=${group.project})
        )
    )
)
       `;
        run_in_django_shell(make_tests);

        best = await Submission.create(group.pk, []);
        let make_best_results = `
from autograder.core.models import AGTestCommand, Submission
import autograder.utils.testing.model_obj_builders as obj_build
from autograder.core.submission_feedback import update_denormalized_ag_test_results

submission = Submission.objects.get(pk=${best.pk})
assert AGTestCommand.objects.count() == 1
obj_build.make_correct_ag_test_command_result(AGTestCommand.objects.first(), submission=submission)
submission.status = Submission.GradingStatus.finished_grading
submission.save()
update_denormalized_ag_test_results(submission.pk)
       `;
        run_in_django_shell(make_best_results);

        most_recent = await Submission.create(group.pk, []);

        let mark_finished = `
from autograder.core.models import Submission
submission = Submission.objects.get(pk=${most_recent.pk})
submission.status = Submission.GradingStatus.finished_grading
submission.save()
        `;
        run_in_django_shell(mark_finished);
   });

    test('Get final graded submission', async () => {
        project.ultimate_submission_policy = UltimateSubmissionPolicy.most_recent;
        await project.save();

        let actual_most_recent = await Submission.get_final_graded_submission_from_group(group.pk);
        await most_recent.refresh();
        expect(actual_most_recent).toEqual(most_recent);

        project.ultimate_submission_policy = UltimateSubmissionPolicy.best;
        await project.save();

        let actual_best = await Submission.get_final_graded_submission_from_group(group.pk);
        await best.refresh();
        expect(actual_best).toEqual(best);
    });
});

describe('List submissions with results tests', () => {
    beforeEach(() => {
        let make_tests = `
from autograder.core.models import Project
import autograder.utils.testing.model_obj_builders as obj_build

obj_build.make_full_ag_test_command(
    obj_build.make_ag_test_case(
        obj_build.make_ag_test_suite(
            Project.objects.get(pk=${group.project})
        )
    )
)
       `;
        run_in_django_shell(make_tests);
    });

    test('get_all_from_group_with_results', async () => {
        let make_submissions = `
from autograder.core.models import AGTestCommand, Group, Submission
import autograder.utils.testing.model_obj_builders as obj_build
from autograder.core.submission_feedback import update_denormalized_ag_test_results

assert AGTestCommand.objects.count() == 1

group = Group.objects.get(pk=${group.pk})
for i in range(3):
    submission = Submission.objects.validate_and_create([], group)
    obj_build.make_correct_ag_test_command_result(
        AGTestCommand.objects.first(), submission=submission)
    submission.status = Submission.GradingStatus.finished_grading
    submission.save()
    update_denormalized_ag_test_results(submission.pk)
        `;
        run_in_django_shell(make_submissions);

        let submissions = await Submission.get_all_from_group_with_results(group.pk);
        expect(submissions.length).toEqual(3);

        for (let submission of submissions) {
            expect(submission.results.total_points).not.toEqual(0);
            expect(submission.results.total_points_possible).not.toEqual(0);
            expect(submission.results.ag_test_suite_results.length).toEqual(1);
            expect(submission.results.mutation_test_suite_results).toEqual([]);
        }

        // Override feedback
        submissions = await Submission.get_all_from_group_with_results(
            group.pk, FeedbackCategory.past_limit_submission);
        expect(submissions.length).toEqual(3);

        for (let submission of submissions) {
            expect(submission.results.total_points).toEqual(0);
            expect(submission.results.total_points_possible).toEqual(0);
            expect(submission.results.ag_test_suite_results.length).toEqual(1);
            expect(submission.results.mutation_test_suite_results).toEqual([]);
        }
    });
});
