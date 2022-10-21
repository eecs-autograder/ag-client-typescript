import {
    Annotation, AppliedAnnotation,
    Comment,
    Course, Criterion, CriterionResult, ExpectedStudentFile, Group,
    HandgradingResult, HandgradingResultObserver,
    HandgradingRubric, PointsStyle,
    Project,
    UltimateSubmissionPolicy,
} from '..';

import {
    do_editable_fields_test,
    expect_dates_equal,
    expect_dates_not_equal,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell, sleep,
} from './utils';

beforeAll(() => {
    global_setup();
});

let course!: Course;
let project!: Project;
let handgrading_rubric!: HandgradingRubric;
let group!: Group;
let group2!: Group;
let finished_submission_pk: number;

class TestObserver implements HandgradingResultObserver {
    handgrading_result: HandgradingResult | null = null;

    created_count = 0;
    changed_count = 0;

    update_handgrading_result_changed(handgrading_result: HandgradingResult): void {
        this.changed_count += 1;
        this.handgrading_result = handgrading_result;
    }

    update_handgrading_result_created(handgrading_result: HandgradingResult): void {
        this.created_count += 1;
        this.handgrading_result = handgrading_result;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project', guests_can_submit: true});
    handgrading_rubric = await HandgradingRubric.create(project.pk, {});
    await ExpectedStudentFile.create(project.pk, {pattern: 'f1.txt'});      // for submission
    group = await Group.create_solo_group(project.pk);
    group2 = await Group.create(project.pk, {member_names: ['ffuxa@umich.edu']});

    // Create submission (using django shell since Submission API hasn't been created yet
    let create_submission = `
from autograder.core.models import Project, Group, Submission
from django.core.files.uploadedfile import SimpleUploadedFile

project = Project.objects.get(pk=${project.pk})
group = Group.objects.get(pk=${group.pk})
submission = Submission.objects.validate_and_create(group=group,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah')])

submission.status = Submission.GradingStatus.finished_grading
submission.save()
print(submission.pk)
`;
    let result = run_in_django_shell(create_submission);
    finished_submission_pk = parseInt(result.stdout, 10);

    observer = new TestObserver();
    HandgradingResult.subscribe(observer);
});

afterEach(() => {
    HandgradingResult.unsubscribe(observer);
});

describe('List/create handgrading result tests', () => {
    test('Handgrading result ctor', () => {
        let now = (new Date()).toISOString();
        let annotations = [
            new Annotation({
                pk: 2,
                handgrading_rubric: handgrading_rubric.pk,
                short_description: "short1",
                long_description: "long1",
                deduction: -1,
                max_deduction: -1,
                last_modified: now,
            }),
            new Annotation({
                pk: 2,
                handgrading_rubric: handgrading_rubric.pk,
                short_description: "short2",
                long_description: "long2",
                deduction: -2,
                max_deduction: -2,
                last_modified: now,
            })
        ];

        let criteria = [
            new Criterion({
                pk: 1,
                handgrading_rubric: handgrading_rubric.pk,
                last_modified: now,
                short_description: "short",
                long_description: "long",
                points: 7,
            }),
            new Criterion({
                pk: 2,
                handgrading_rubric: handgrading_rubric.pk,
                last_modified: now,
                short_description: "short2",
                long_description: "long2",
                points: 5,
            })
        ];

        let applied_annotations = [
            // Should work with AppliedAnnotationData and AppliedAnnotation
            {
                pk: 1,
                last_modified: now,
                location: {
                    pk: 2,
                    first_line: 3,
                    last_line: 4,
                    filename: 'file1.txt',
                    last_modified: now,
                },
                annotation: annotations[0],
                handgrading_result: 22,
            },
            // Should work with AppliedAnnotationData and AppliedAnnotation
            new AppliedAnnotation({
                pk: 2,
                last_modified: now,
                location: {
                    first_line: 2,
                    last_line: 3,
                    filename: 'file1.txt',
                },
                annotation: annotations[1],
                handgrading_result: 22,
            })
        ];

        let criterion_results = [
            // Should work with CriterionResultData and CriterionResult
            {
                pk: 1,
                last_modified: now,
                selected: false,
                criterion: criteria[0],
                handgrading_result: 22,
            },
            // Should work with CriterionResultData and CriterionResult
            new CriterionResult({
                pk: 2,
                last_modified: now,
                selected: true,
                criterion: criteria[1],
                handgrading_result: 22,
            })
        ];

        let comments = [
            // Should work with CommentData and Comment
            {
                pk: 1,
                last_modified: now,
                location: {
                    pk: 1,
                    first_line: 2,
                    last_line: 3,
                    filename: 'file1.txt',
                },
                text: "sample comment",
                handgrading_result: 22,
            },
            // Should work with CommentData and Comment
            new Comment({
                pk: 2,
                last_modified: now,
                location: {
                    first_line: 3,
                    last_line: 4,
                    filename: 'file1.txt',
                },
                text: "sample comment 2",
                handgrading_result: 22,
            })
        ];

        let handgrading_rubric_data = {
            pk: 1,
            project: 1,
            last_modified: now,
            points_style: PointsStyle.start_at_zero_and_add,
            max_points: null,
            show_grades_and_rubric_to_students: false,
            show_only_applied_rubric_to_students: false,
            handgraders_can_leave_comments: false,
            handgraders_can_adjust_points: false,
            criteria: criteria,
            annotations: annotations
        };

        let handgrading_result = new HandgradingResult({
            pk: 22,
            last_modified: now,
            submission: 2,
            handgrading_rubric: handgrading_rubric_data,
            group: 2,
            applied_annotations: applied_annotations,
            comments: comments,
            criterion_results: criterion_results,
            finished_grading: false,
            points_adjustment: 0,
            submitted_filenames: ['file1.txt'],
            total_points: 10,
            total_points_possible: 10,
        });

        expect(handgrading_result.pk).toEqual(22);
        expect(handgrading_result.last_modified).toEqual(now);
        expect(handgrading_result.submission).toEqual(2);
        expect(handgrading_result.handgrading_rubric).toEqual(handgrading_rubric_data);
        expect(handgrading_result.group).toEqual(2);
        expect(handgrading_result.finished_grading).toEqual(false);
        expect(handgrading_result.points_adjustment).toEqual(0);
        expect(handgrading_result.submitted_filenames).toEqual(['file1.txt']);
        expect(handgrading_result.total_points).toEqual(10);
        expect(handgrading_result.total_points_possible).toEqual(10);

        expect(handgrading_result.applied_annotations).toEqual(
            [new AppliedAnnotation(applied_annotations[0]), applied_annotations[1]]);
        expect(handgrading_result.comments).toEqual([new Comment(comments[0]), comments[1]]);
        expect(handgrading_result.criterion_results).toEqual(
            [new CriterionResult(criterion_results[0]), criterion_results[1]]);
    });

    test('List handgrading results from project no next or previous', async () => {
        let create_handgrading_results = `
from autograder.core.models import Group, Project, Submission
from autograder.handgrading.models import HandgradingRubric, HandgradingResult
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User

project = Project.objects.get(pk=${project.pk})
handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
group = Group.objects.get(pk=${group.pk})
group2 = Group.objects.get(pk=${group2.pk})

submission1 = Submission.objects.validate_and_create(group=group,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah1')])
submission2 = Submission.objects.validate_and_create(group=group2,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah2')])

HandgradingResult.objects.validate_and_create(group=group, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=2, submission=submission1)
HandgradingResult.objects.validate_and_create(group=group2, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=5, submission=submission2)
        `;

        run_in_django_shell(create_handgrading_results);
        await sleep(2);
        await group.refresh();
        await group2.refresh();
        let loaded_handgrading_results_info =
            await HandgradingResult.get_all_summaries_from_project(project.pk);

        expect(loaded_handgrading_results_info.count).toEqual(2);
        expect(loaded_handgrading_results_info.next).toBeNull();
        expect(loaded_handgrading_results_info.previous).toBeNull();
        expect(loaded_handgrading_results_info.results.length).toEqual(2);

        let sorted_results = loaded_handgrading_results_info.results.sort((a, b) => a.pk - b.pk);

        expect(sorted_results[0].pk).not.toEqual(sorted_results[1].pk);

        // Check first result info
        expect(sorted_results[0].project).toEqual(project.pk);
        expect(sorted_results[0].extended_due_date).toEqual(group.extended_due_date);
        expect(sorted_results[0].member_names).toEqual(group.member_names);
        expect(sorted_results[0].bonus_submissions_remaining).toEqual(
            group.bonus_submissions_remaining);
        expect(sorted_results[0].late_days_used).toEqual(group.late_days_used);
        expect(sorted_results[0].num_submissions).toEqual(group.num_submissions);
        expect(sorted_results[0].num_submits_towards_limit).toEqual(
            group.num_submits_towards_limit);
        expect(sorted_results[0].handgrading_result!.finished_grading).toEqual(false);
        expect(sorted_results[0].handgrading_result!.total_points).toEqual(2);
        expect(sorted_results[0].handgrading_result!.total_points_possible).toEqual(0);

        // Check second result info
        expect(sorted_results[1].project).toEqual(project.pk);
        expect(sorted_results[1].extended_due_date).toEqual(group2.extended_due_date);
        expect(sorted_results[1].member_names).toEqual(group2.member_names);
        expect(sorted_results[1].bonus_submissions_remaining).toEqual(
            group2.bonus_submissions_remaining);
        expect(sorted_results[1].late_days_used).toEqual(group2.late_days_used);
        expect(sorted_results[1].num_submissions).toEqual(group2.num_submissions);
        expect(sorted_results[1].num_submits_towards_limit).toEqual(
            group2.num_submits_towards_limit);
        expect(sorted_results[1].handgrading_result!.finished_grading).toEqual(false);
        expect(sorted_results[1].handgrading_result!.total_points).toEqual(5);
        expect(sorted_results[1].handgrading_result!.total_points_possible).toEqual(0);
    });


    test('List handgrading results from project with next and previous', async () => {
        let create_handgrading_results = `
from autograder.core.models import Group, Project, Submission
from autograder.handgrading.models import HandgradingRubric, HandgradingResult
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User

project = Project.objects.get(pk=${project.pk})
handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
member2 = User.objects.get_or_create(username='thisisarealname@umich.edu')[0]

group1 = Group.objects.get(pk=${group.pk})
group2 = Group.objects.get(pk=${group2.pk})
group3 = Group.objects.validate_and_create(project=project, members=[member2])

submission1 = Submission.objects.validate_and_create(group=group1,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah1')])
submission2 = Submission.objects.validate_and_create(group=group2,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah2')])
submission3 = Submission.objects.validate_and_create(group=group3,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah3')])

HandgradingResult.objects.validate_and_create(group=group1, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=2, submission=submission1)
HandgradingResult.objects.validate_and_create(group=group2, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=5, submission=submission2)
HandgradingResult.objects.validate_and_create(group=group3, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=4, submission=submission3)
        `;

        run_in_django_shell(create_handgrading_results);
        let loaded_second_handgrading_results_page =
            await HandgradingResult.get_all_summaries_from_project(
                project.pk, {page_num: 2, page_size: 1});

        expect(loaded_second_handgrading_results_page.count).toEqual(3);

        let next_url_without_base = remove_base_url(loaded_second_handgrading_results_page.next!);
        let previous_url_without_base = remove_base_url(
            loaded_second_handgrading_results_page.previous!);

        expect(next_url_without_base).toBe(
            `/api/projects/${project.pk}/handgrading_results/`
            + `?include_staff=true&page=3&page_size=1`);
        expect(previous_url_without_base).toBe(
            `/api/projects/${project.pk}/handgrading_results/?include_staff=true&page_size=1`
        );
        expect(loaded_second_handgrading_results_page.results.length).toEqual(1);
    });

    test('List handgrading results do not include staff', async () => {
        let create_handgrading_results = `
from autograder.core.models import Group, Project, Submission
from autograder.handgrading.models import HandgradingRubric, HandgradingResult
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User

project = Project.objects.get(pk=${project.pk})
handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
group = Group.objects.get(pk=${group.pk})
group2 = Group.objects.get(pk=${group2.pk})

submission1 = Submission.objects.validate_and_create(group=group,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah1')])
submission2 = Submission.objects.validate_and_create(group=group2,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah2')])

HandgradingResult.objects.validate_and_create(group=group, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=2, submission=submission1)
HandgradingResult.objects.validate_and_create(group=group2, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=5, submission=submission2)
        `;

        run_in_django_shell(create_handgrading_results);
        await sleep(2);
        let loaded_handgrading_results_info =
            await HandgradingResult.get_all_summaries_from_project(
                project.pk, {include_staff: false});

        expect(loaded_handgrading_results_info.count).toEqual(1);
        expect(loaded_handgrading_results_info.next).toBeNull();
        expect(loaded_handgrading_results_info.previous).toBeNull();

        let actual_total_points = loaded_handgrading_results_info.results.map(
            result => result.handgrading_result!.total_points);
        expect(actual_total_points).toEqual([5]);
    });

    test('List handgrading results with page_url', async () => {
        let create_handgrading_results = `
from autograder.core.models import Group, Project, Submission, Course
from autograder.handgrading.models import HandgradingRubric, HandgradingResult
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User

project = Project.objects.get(pk=${project.pk})
course = Course.objects.get(pk=${course.pk})
handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
member3 = User.objects.get_or_create(username='thisisarealname@umich.edu')[0]

group1 = Group.objects.get(pk=${group.pk})
group2 = Group.objects.get(pk=${group2.pk})
group3 = Group.objects.validate_and_create(project=project, members=[member3])

submission1 = Submission.objects.validate_and_create(group=group1,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah1')])
submission2 = Submission.objects.validate_and_create(group=group2,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah2')])
submission3 = Submission.objects.validate_and_create(group=group3,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah3')])

HandgradingResult.objects.validate_and_create(group=group1, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=2, submission=submission1)
HandgradingResult.objects.validate_and_create(group=group2, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=5, submission=submission2)
HandgradingResult.objects.validate_and_create(group=group3, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=4, submission=submission3)
        `;

        run_in_django_shell(create_handgrading_results);
        let loaded_second_handgrading_results_page =
            await HandgradingResult.get_all_summaries_from_project(
                project.pk, {page_num: 2, page_size: 1});
        let next_url = loaded_second_handgrading_results_page.next!;
        let loaded_third_handgrading_results_page =
            await HandgradingResult.get_all_summaries_from_project(
                project.pk, {page_url: next_url});

        expect(loaded_third_handgrading_results_page.count).toEqual(3);

        let next_url_without_base = remove_base_url(loaded_third_handgrading_results_page.next!);
        let previous_url_without_base = remove_base_url(
            loaded_third_handgrading_results_page.previous!);

        expect(next_url_without_base).toBeNull();
        expect(previous_url_without_base).toEqual(
            `/api/projects/${project.pk}/handgrading_results/`
            + `?include_staff=true&page=2&page_size=1`
        );
        expect(loaded_third_handgrading_results_page.results.length).toEqual(1);
    });

    test('Create handgrading result', async () => {
        let created = await HandgradingResult.get_or_create(group.pk);

        // First check if result from summary matches
        let loaded_summary = await HandgradingResult.get_all_summaries_from_project(project.pk);
        expect(loaded_summary.count).toEqual(2);
        let sorted_results = loaded_summary.results.sort((a, b) => b.pk - a.pk);
        // Highest pk will be one that was just created
        let actual_result_summary = sorted_results[sorted_results.length - 1];

        expect(created.group).toEqual(actual_result_summary.pk);

        expect(actual_result_summary.handgrading_result!.finished_grading).toEqual(false);
        expect(actual_result_summary.handgrading_result!.total_points).toEqual(0);
        expect(actual_result_summary.handgrading_result!.total_points_possible).toEqual(0);

        expect(observer.handgrading_result!.group).toEqual(actual_result_summary.pk);

        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        // Now get handgrading result with pk and check if it matches
        let actual_result = await HandgradingResult.get_by_group_pk(group.pk);

        expect(created).toEqual(actual_result);

        expect(actual_result.submission).toEqual(finished_submission_pk);
        expect(actual_result.handgrading_rubric).toEqual(handgrading_rubric);
        expect(actual_result.group).toEqual(group.pk);
        expect(actual_result.applied_annotations).toEqual([]);
        expect(actual_result.comments).toEqual([]);
        expect(actual_result.criterion_results).toEqual([]);
        expect(actual_result.finished_grading).toEqual(false);
        expect(actual_result.points_adjustment).toEqual(0);
        expect(actual_result.submitted_filenames).toEqual(['f1.txt']);
        expect(actual_result.total_points).toEqual(0);
        expect(actual_result.total_points_possible).toEqual(0);

        expect(observer.handgrading_result).toEqual(actual_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let handgrading_result = await HandgradingResult.get_or_create(group.pk);

        expect(observer.handgrading_result).toEqual(handgrading_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        HandgradingResult.unsubscribe(observer);

        await handgrading_result.save_finished_grading();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});

describe('Get/update/reset handgrading result tests', () => {
    let handgrading_result!: HandgradingResult;

    beforeEach(async () => {
        handgrading_result = await HandgradingResult.get_or_create(group.pk);
    });

    test('Get handgrading result', async () => {
        let loaded = await HandgradingResult.get_by_group_pk(group.pk);
        expect(loaded).toEqual(handgrading_result);
    });

    test('Update handgrading result', async () => {
        handgrading_rubric.handgraders_can_adjust_points = true;
        await handgrading_rubric.save();

        let change_to_handgrader = `
from autograder.core.models import Course
course = Course.objects.get(pk=${course.pk})
course.handgraders.add(*course.admins.all())
course.admins.clear()
        `;
        run_in_django_shell(change_to_handgrader);

        let old_timestamp = handgrading_result.last_modified;
        handgrading_result.finished_grading = true;

        await sleep(1);
        await handgrading_result.save_finished_grading();

        let loaded = await HandgradingResult.get_by_group_pk(group.pk);
        expect(loaded.finished_grading).toEqual(true);
        expect_dates_not_equal(loaded.last_modified, old_timestamp);

        expect(handgrading_result).toEqual(loaded);

        expect(observer.handgrading_result).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);

        old_timestamp = handgrading_result.last_modified;
        handgrading_result.points_adjustment = 2;

        await sleep(1);
        await handgrading_result.save_points_adjustment();

        loaded = await HandgradingResult.get_by_group_pk(group.pk);
        expect(loaded.finished_grading).toEqual(true);
        expect(loaded.points_adjustment).toEqual(2);
        expect_dates_not_equal(loaded.last_modified, old_timestamp);

        expect(handgrading_result).toEqual(loaded);

        expect(observer.handgrading_result).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(2);
    });

    test('Editable fields', () => {
        do_editable_fields_test(
            HandgradingResult, 'HandgradingResult', 'autograder.handgrading.models');
    });

    test('Refresh handgrading result', async () => {
        let old_timestamp = handgrading_result.last_modified;
        await sleep(1);

        await handgrading_result.refresh();
        expect_dates_equal(handgrading_result.last_modified, old_timestamp);
        expect(observer.handgrading_result).toEqual(handgrading_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        let change_handgrading_result = `
from autograder.handgrading.models import HandgradingResult

handgrading_result = HandgradingResult.objects.get(pk=${handgrading_result.pk})
handgrading_result.validate_and_update(finished_grading=True)
        `;
        run_in_django_shell(change_handgrading_result);

        await handgrading_result.refresh();

        expect(handgrading_result.finished_grading).toEqual(true);
        expect_dates_not_equal(handgrading_result.last_modified, old_timestamp);

        expect(observer.handgrading_result).toEqual(handgrading_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);

        await Criterion.create(handgrading_rubric.pk, {points: 2});

        await handgrading_result.refresh();
        expect(handgrading_result.criterion_results.length).toEqual(1);
        expect(handgrading_result.total_points).toEqual(0);
        expect(handgrading_result.total_points_possible).toEqual(2);
        expect(observer.changed_count).toEqual(2);

        handgrading_result.criterion_results[0].selected = true;
        await handgrading_result.criterion_results[0].save();
        await handgrading_result.refresh();
        expect(handgrading_result.total_points).toEqual(2);
        expect(handgrading_result.total_points_possible).toEqual(2);
        expect(observer.changed_count).toEqual(3);
    });

    test('Reset handgrading result', async () => {
        let original = handgrading_result;
        let new_result = await HandgradingResult.reset(group.pk);
        expect(new_result.group).toEqual(group.pk);
        expect(new_result.pk).not.toEqual(original.pk);
        expect(observer.changed_count).toEqual(1);
    });

    test('has_correct_submission', async () => {
        expect(await handgrading_result.has_correct_submission()).toBe(true);

        expect(project.ultimate_submission_policy).toEqual(UltimateSubmissionPolicy.most_recent);
        let add_submission = `
from autograder.core.models import Group, Submission

group = Group.objects.get(pk=${group.pk})

new_submission = Submission.objects.validate_and_create(group=group, submitted_files=[])
new_submission.status = Submission.GradingStatus.finished_grading
new_submission.save()
        `;
        run_in_django_shell(add_submission);

        expect(await handgrading_result.has_correct_submission()).toBe(false);
    });

    test('Get file from handgrading result', async () => {
        let loaded_file = await HandgradingResult.get_file_from_handgrading_result(
            group.pk, "f1.txt");

        expect(loaded_file).toEqual('blah');

        expect(observer.handgrading_result).toEqual(handgrading_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });

    test('Get instead of create from project', async () => {
        let loaded = await HandgradingResult.get_or_create(group.pk);

        expect(loaded).toEqual(handgrading_result);

        // Created count shouldn't increase
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});


function remove_base_url(url: string) {
    /*
     * Replace base URL in given string, if it exists, and return the result.
     *
     * e.g. "http://localhost:9000/api/v1/blah/" becomes "/api/v1/blah/"
     *      "/api/v1/blah/" stays "/api/v1/blah/"
     *
     * Source:
     *      http://www.wkoorts.com/wkblog/2012/10/09/javascript-snippet-remove-base-url-from-link/
     */
    let base_url_pattern = /^https?:\/\/[a-z:0-9.]+/;
    let result = "";

    let match = base_url_pattern.exec(url);
    if (match !== null) {
        result = match[0];
    }

    if (result.length > 0) {
        url = url.replace(result, "");
    }

    return url;
}
