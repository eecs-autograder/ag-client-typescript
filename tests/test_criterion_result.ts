import {
    Course,
    Criterion,
    CriterionResult, CriterionResultObserver,
    ExpectedStudentFile,
    Group,
    HandgradingResult,
    HandgradingRubric,
    Project
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
let handgrading_result!: HandgradingResult;
let criterion!: Criterion;
let criterion_result_pk: number = 1;

class TestObserver implements CriterionResultObserver {
    criterion_result: CriterionResult | null = null;

    changed_count = 0;
    deleted_count = 0;

    update_criterion_result_changed(criterion_result: CriterionResult): void {
        this.changed_count += 1;
        this.criterion_result = criterion_result;
    }

    update_criterion_result_deleted(criterion_result: CriterionResult): void {
        this.deleted_count += 1;
        this.criterion_result = null;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project'});
    handgrading_rubric = await HandgradingRubric.create(project.pk, {});
    await ExpectedStudentFile.create(project.pk, {pattern: 'f1.txt'});      // for submission
    let group = await Group.create_solo_group(project.pk);

    // Create submission (using django shell since Submission API hasn't been created yet)
    let create_submission = `
from autograder.core.models import Project, Group, Submission
from django.core.files.uploadedfile import SimpleUploadedFile

project = Project.objects.get(pk=${project.pk})
group = Group.objects.get(pk=${group.pk})
submission = Submission.objects.validate_and_create(group=group,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah')])

submission.status = Submission.GradingStatus.finished_grading
submission.save()
`;
    run_in_django_shell(create_submission);

    handgrading_result = await HandgradingResult.get_or_create(group.pk);
    criterion = await Criterion.create(handgrading_rubric.pk, {short_description: 'Criterion1'});

    // A CriterionResult is automatically created for each HandgradingResult when a Criterion is
    // created. We want to get the pk of this CriterionResult for later use
    let print_criterion_result_pk = `
from autograder.handgrading.models import CriterionResult
criterion_results = CriterionResult.objects.all()
print(criterion_results[0].pk)
`;
    let shell_output = run_in_django_shell(print_criterion_result_pk).stdout;
    criterion_result_pk = parseInt(shell_output, 10);

    observer = new TestObserver();
    CriterionResult.subscribe(observer);
});

afterEach(() => {
    CriterionResult.unsubscribe(observer);
});

describe('List/create criterion result tests', () => {
    test('Criterion result ctor', () => {
        let now = (new Date()).toISOString();
        let expected_student_file = new CriterionResult({
            pk: 6,
            last_modified: now,
            selected: false,
            criterion: criterion,
            handgrading_result: handgrading_result.pk,
        });

        expect(expected_student_file.pk).toEqual(6);
        expect(expected_student_file.last_modified).toEqual(now);
        expect(expected_student_file.selected).toEqual(false);
        expect(expected_student_file.criterion).toEqual(criterion);
        expect(expected_student_file.handgrading_result).toEqual(handgrading_result.pk);
    });

    test('List criterion result', async () => {
        let create_criterion_result = `
from autograder.handgrading.models import (
    HandgradingResult, CriterionResult, Criterion, HandgradingRubric
)
rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
result = HandgradingResult.objects.get(pk=${handgrading_result.pk})

c2 = Criterion.objects.validate_and_create(
    handgrading_rubric=rubric, short_description='Criterion2')
c3 = Criterion.objects.validate_and_create(
    handgrading_rubric=rubric, short_description='Criterion3')

CriterionResult.objects.validate_and_create(handgrading_result=result, selected=True, criterion=c2)
CriterionResult.objects.validate_and_create(handgrading_result=result, selected=True, criterion=c3)
        `;
        run_in_django_shell(create_criterion_result);

        let loaded_criterion_results = await CriterionResult.get_all_from_handgrading_result(
            handgrading_result.pk);

        let sorted_criterion_results = loaded_criterion_results.sort((a, b) => a.pk - b.pk);
        expect(sorted_criterion_results.length).toEqual(3);
        expect(sorted_criterion_results[0].pk).toEqual(criterion_result_pk);
        expect(sorted_criterion_results[0].selected).toEqual(false);
        expect(sorted_criterion_results[0].handgrading_result).toEqual(handgrading_result.pk);
        expect(sorted_criterion_results[0].criterion).toEqual(criterion);

        expect(sorted_criterion_results[1].selected).toEqual(true);
        expect(sorted_criterion_results[1].handgrading_result).toEqual(handgrading_result.pk);
        expect(sorted_criterion_results[1].criterion.short_description).toEqual('Criterion2');

        // expect(sorted_criterion_results[2].pk).toEqual(3);
        expect(sorted_criterion_results[2].selected).toEqual(true);
        expect(sorted_criterion_results[2].handgrading_result).toEqual(handgrading_result.pk);
        expect(sorted_criterion_results[2].criterion.short_description).toEqual('Criterion3');
    });
});

describe('Get/update/delete criterion result tests', () => {
    let criterion_result!: CriterionResult;

    test('Get criterion result', async () => {
        let loaded = await CriterionResult.get_by_pk(criterion_result_pk);
        expect(loaded.pk).toEqual(criterion_result_pk);
        expect(loaded.selected).toEqual(false);
        expect(loaded.criterion).toEqual(criterion);
        expect(loaded.handgrading_result).toEqual(handgrading_result.pk);
    });

    test('Update criterion result', async () => {
        criterion_result = await CriterionResult.get_by_pk(criterion_result_pk);

        let old_timestamp = criterion_result.last_modified;
        criterion_result.selected = false;

        await sleep(1);
        await criterion_result.save();

        let loaded = await CriterionResult.get_by_pk(criterion_result.pk);
        expect(loaded.selected).toEqual(false);
        expect_dates_not_equal(loaded.last_modified, old_timestamp);

        expect(criterion_result).toEqual(loaded);

        expect(observer.criterion_result).toEqual(loaded);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Editable fields', () => {
        do_editable_fields_test(
            CriterionResult, 'CriterionResult', 'autograder.handgrading.models');
    });

    test('Refresh criterion result', async () => {
        criterion_result = await CriterionResult.get_by_pk(criterion_result_pk);

        let old_timestamp = criterion_result.last_modified;
        await sleep(1);

        await criterion_result.refresh();
        expect_dates_equal(criterion_result.last_modified, old_timestamp);
        expect(observer.criterion_result).toBeNull();
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        let change_criterion_result = `
from autograder.handgrading.models import CriterionResult

criterion_result = CriterionResult.objects.get(pk=${criterion_result.pk})
criterion_result.validate_and_update(selected=True)
        `;
        run_in_django_shell(change_criterion_result);

        await criterion_result.refresh();

        expect(criterion_result.selected).toEqual(true);
        expect_dates_not_equal(criterion_result.last_modified, old_timestamp);

        expect(observer.criterion_result).toEqual(criterion_result);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Delete criterion result', async () => {
        criterion_result = await CriterionResult.get_by_pk(criterion_result_pk);
        await criterion_result.delete();

        expect(observer.criterion_result).toBeNull();
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(1);

        let loaded_list = await CriterionResult.get_all_from_handgrading_result(
            handgrading_result.pk);
        expect(loaded_list.length).toEqual(0);
    });

    test('Unsubscribe', async () => {
        criterion_result = await CriterionResult.get_by_pk(criterion_result_pk);

        expect(observer.criterion_result).toBeNull();
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        CriterionResult.unsubscribe(observer);

        await criterion_result.save();
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });
});
