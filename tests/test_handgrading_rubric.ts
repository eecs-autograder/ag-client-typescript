import {
    Annotation,
    Course, Criterion,
    HandgradingRubric, HandgradingRubricObserver,
    NewAnnotationData, NewCriterionData, NewHandgradingRubricData,
    PointsStyle, Project
} from '..';

import {
    do_editable_fields_test,
    expect_dates_equal,
    expect_dates_not_equal,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
    sleep,
} from './utils';

beforeAll(() => {
    global_setup();
});

let course!: Course;
let project!: Project;

class TestObserver implements HandgradingRubricObserver {
    handgrading_rubric: HandgradingRubric | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    update_handgrading_rubric_changed(handgrading_rubric: HandgradingRubric): void {
        this.changed_count += 1;
        this.handgrading_rubric = handgrading_rubric;
    }

    update_handgrading_rubric_created(handgrading_rubric: HandgradingRubric): void {
        this.created_count += 1;
        this.handgrading_rubric = handgrading_rubric;
    }

    update_handgrading_rubric_deleted(handgrading_rubric: HandgradingRubric): void {
        this.deleted_count += 1;
        this.handgrading_rubric = null;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project'});
    observer = new TestObserver();
    HandgradingRubric.subscribe(observer);
});

afterEach(() => {
    HandgradingRubric.unsubscribe(observer);
});

describe('List/create handgrading rubric tests', () => {
    test('Handgrading rubric ctor', () => {
        let now = (new Date()).toISOString();
        let criteria = [
            // Should work with CriterionData and Criterion
            {
                pk: 4,
                handgrading_rubric: 21,
                last_modified: now,
                short_description: "short123",
                long_description: "long123",
                points: 21,
            },
            // Should work with CriterionData and Criterion
            new Criterion({
                pk: 3,
                handgrading_rubric: 21,
                last_modified: now,
                short_description: "short1",
                long_description: "long1",
                points: 3,
            })
        ];

        let annotations = [
            // Should work with AnnotationData and Annotation
            {
                pk: 2,
                handgrading_rubric: 22,
                short_description: "short321",
                long_description: "long321",
                deduction: -3,
                max_deduction: -6,
                last_modified: now,
            },
            // Should work with AnnotationData and Annotation
            new Annotation({
                pk: 2,
                handgrading_rubric: 25,
                short_description: "short2",
                long_description: "long2",
                deduction: -2,
                max_deduction: null,
                last_modified: now,
            })
        ];

        let handgrading_rubric = new HandgradingRubric({
            pk: 21,
            project: project.pk,
            last_modified: now,
            points_style: PointsStyle.start_at_zero_and_add,
            max_points: null,
            show_grades_and_rubric_to_students: false,
            show_only_applied_rubric_to_students: false,
            handgraders_can_leave_comments: true,
            handgraders_can_adjust_points: true,
            criteria: criteria,
            annotations: annotations,
        });

        expect(handgrading_rubric.pk).toEqual(21);
        expect(handgrading_rubric.project).toEqual(project.pk);
        expect(handgrading_rubric.last_modified).toEqual(now);
        expect(handgrading_rubric.points_style).toEqual(PointsStyle.start_at_zero_and_add);
        expect(handgrading_rubric.max_points).toBeNull();
        expect(handgrading_rubric.show_grades_and_rubric_to_students).toEqual(false);
        expect(handgrading_rubric.show_only_applied_rubric_to_students).toEqual(false);
        expect(handgrading_rubric.handgraders_can_leave_comments).toEqual(true);
        expect(handgrading_rubric.handgraders_can_adjust_points).toEqual(true);

        expect(handgrading_rubric.criteria).toEqual([new Criterion(criteria[0]), criteria[1]]);
        expect(handgrading_rubric.annotations).toEqual(
            [new Annotation(annotations[0]), annotations[1]]);
    });

    test('Get handgrading rubric from project', async () => {
        let create_handgrading_rubric = `
from autograder.core.models import Project
from autograder.handgrading.models import HandgradingRubric
project = Project.objects.get(pk=${project.pk})

rubric = HandgradingRubric.objects.validate_and_create(project=project, max_points=321)
print(rubric.pk)
        `;

        let result = run_in_django_shell(create_handgrading_rubric);
        let expected_pk = parseInt(result.stdout, 10);
        let loaded_handgrading_rubric = await HandgradingRubric.get_from_project(project.pk);

        // Make sure the loaded HandgradingRubric is the correct one
        expect(loaded_handgrading_rubric.pk).toEqual(expected_pk);
        expect(loaded_handgrading_rubric.project).toEqual(project.pk);
        expect(loaded_handgrading_rubric.points_style).toEqual(PointsStyle.start_at_zero_and_add);
        expect(loaded_handgrading_rubric.max_points).toEqual(321);
        expect(loaded_handgrading_rubric.show_grades_and_rubric_to_students).toEqual(false);
        expect(loaded_handgrading_rubric.handgraders_can_leave_comments).toEqual(false);
        expect(loaded_handgrading_rubric.handgraders_can_adjust_points).toEqual(false);
        expect(loaded_handgrading_rubric.criteria).toEqual([]);
        expect(loaded_handgrading_rubric.annotations).toEqual([]);
    });

    test('Create handgrading rubric only required fields', async () => {
        let created = await HandgradingRubric.create(project.pk, {});
        let loaded = await HandgradingRubric.get_from_project(project.pk);

        expect(created).toEqual(loaded);

        expect(loaded.project).toEqual(project.pk);
        expect(loaded.points_style).toEqual(PointsStyle.start_at_zero_and_add);
        expect(loaded.max_points).toBeNull();
        expect(loaded.show_grades_and_rubric_to_students).toEqual(false);
        expect(loaded.handgraders_can_leave_comments).toEqual(false);
        expect(loaded.handgraders_can_adjust_points).toEqual(false);
        expect(loaded.criteria).toEqual([]);
        expect(loaded.annotations).toEqual([]);

        expect(observer.handgrading_rubric).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Create handgrading rubric all fields', async () => {
        let created = await HandgradingRubric.create(
            project.pk,
            new NewHandgradingRubricData({
                points_style: PointsStyle.start_at_max_and_subtract,
                max_points: 10,
                show_grades_and_rubric_to_students: true,
                handgraders_can_leave_comments: false,
                handgraders_can_adjust_points: false,
            })
        );

        let actual = await HandgradingRubric.get_from_project(project.pk);
        expect(created).toEqual(actual);

        expect(actual.points_style).toEqual(PointsStyle.start_at_max_and_subtract);
        expect(actual.max_points).toEqual(10);
        expect(actual.show_grades_and_rubric_to_students).toEqual(true);
        expect(actual.handgraders_can_leave_comments).toEqual(false);
        expect(actual.handgraders_can_adjust_points).toEqual(false);
        expect(actual.criteria).toEqual([]);
        expect(actual.annotations).toEqual([]);

        expect(observer.handgrading_rubric).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Import handgrading rubric', async () => {
        let other_course = await Course.create({name: 'Other course'});
        let other_project = await Project.create(other_course.pk, {name: 'Other project'});
        let original_rubric = await HandgradingRubric.create(other_project.pk, {max_points: 35});

        let imported = await HandgradingRubric.import_from_project(project.pk, other_project.pk);
        let loaded = await HandgradingRubric.get_from_project(project.pk);
        expect(imported).toEqual(loaded);
        expect(imported.project).toEqual(project.pk);
        expect(imported.max_points).toEqual(35);

        expect(original_rubric.pk).not.toEqual(imported.pk);
        expect(original_rubric.max_points).toEqual(imported.max_points);

        expect(observer.handgrading_rubric).toEqual(imported);
        expect(observer.created_count).toEqual(2);
    });

    test('Unsubscribe', async () => {
        let handgrading_rubric = await HandgradingRubric.create(
            project.pk, {});

        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        HandgradingRubric.unsubscribe(observer);

        await handgrading_rubric.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});

describe('Get/update/delete handgrading rubric tests', () => {
    let handgrading_rubric!: HandgradingRubric;

    beforeEach(async () => {
        handgrading_rubric = await HandgradingRubric.create(project.pk, {});
    });

    test('Get handgrading rubric', async () => {
        let loaded = await HandgradingRubric.get_by_pk(handgrading_rubric.pk);
        expect(loaded).toEqual(handgrading_rubric);
    });

    test('Get handgrading rubric with criteria and annotations', async () => {
        let criterion = await Criterion.create(handgrading_rubric.pk, new NewCriterionData({
            short_description: "short 1",
            long_description: "long 1",
            points: 20,
        }));

        let annotation = await Annotation.create(handgrading_rubric.pk, new NewAnnotationData({
            short_description: "short 2",
            long_description: "long 2",
            deduction: -40,
        }));

        let loaded = await HandgradingRubric.get_from_project(project.pk);
        expect(loaded).not.toEqual(handgrading_rubric);

        // Check that all fields match except for criteria and annotations
        expect(loaded.points_style).toEqual(handgrading_rubric.points_style);
        expect(loaded.max_points).toEqual(handgrading_rubric.max_points);
        expect(loaded.show_grades_and_rubric_to_students).toEqual(
            handgrading_rubric.show_grades_and_rubric_to_students);
        expect(loaded.handgraders_can_leave_comments).toEqual(
            handgrading_rubric.handgraders_can_leave_comments);
        expect(loaded.handgraders_can_adjust_points).toEqual(
            handgrading_rubric.handgraders_can_adjust_points);

        // Check criteria and annotations
        expect(loaded.criteria).not.toEqual(handgrading_rubric.criteria);
        expect(loaded.annotations).not.toEqual(handgrading_rubric.annotations);
        expect(loaded.criteria).toEqual([criterion]);
        expect(loaded.annotations).toEqual([annotation]);

        // Now check that the same is true if loaded by pk
        let loaded_from_project = await HandgradingRubric.get_by_pk(handgrading_rubric.pk);
        expect(loaded_from_project).not.toEqual(handgrading_rubric);

        // Check that all fields match except for criteria and annotations
        expect(loaded_from_project.points_style).toEqual(handgrading_rubric.points_style);
        expect(loaded_from_project.max_points).toEqual(handgrading_rubric.max_points);
        expect(loaded_from_project.show_grades_and_rubric_to_students).toEqual(
            handgrading_rubric.show_grades_and_rubric_to_students);
        expect(loaded_from_project.handgraders_can_leave_comments).toEqual(
            handgrading_rubric.handgraders_can_leave_comments);
        expect(loaded_from_project.handgraders_can_adjust_points).toEqual(
            handgrading_rubric.handgraders_can_adjust_points);

        // Check criteria and annotations
        expect(loaded_from_project.criteria).not.toEqual(handgrading_rubric.criteria);
        expect(loaded_from_project.annotations).not.toEqual(handgrading_rubric.annotations);
        expect(loaded_from_project.criteria).toEqual([criterion]);
        expect(loaded_from_project.annotations).toEqual([annotation]);
    });

    test('Update handgrading rubric', async () => {
        let old_timestamp = handgrading_rubric.last_modified;
        handgrading_rubric.points_style = PointsStyle.start_at_max_and_subtract;
        handgrading_rubric.max_points = 2;
        handgrading_rubric.show_grades_and_rubric_to_students = true;
        handgrading_rubric.handgraders_can_adjust_points = true;
        handgrading_rubric.handgraders_can_leave_comments = true;

        await sleep(1);
        await handgrading_rubric.save();

        let loaded = await HandgradingRubric.get_by_pk(handgrading_rubric.pk);
        expect(loaded.points_style).toEqual(PointsStyle.start_at_max_and_subtract);
        expect(loaded.max_points).toEqual(2);
        expect(loaded.show_grades_and_rubric_to_students).toEqual(true);
        expect(loaded.handgraders_can_adjust_points).toEqual(true);
        expect(loaded.handgraders_can_leave_comments).toEqual(true);

        expect_dates_not_equal(loaded.last_modified, old_timestamp);

        expect(handgrading_rubric).toEqual(loaded);

        expect(observer.handgrading_rubric).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Editable fields', () => {
        do_editable_fields_test(HandgradingRubric, 'HandgradingRubric',
                                'autograder.handgrading.models');
    });

    test('Refresh handgrading rubric', async () => {
        let old_timestamp = handgrading_rubric.last_modified;
        await sleep(1);

        await handgrading_rubric.refresh();
        expect_dates_equal(handgrading_rubric.last_modified, old_timestamp);
        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        expect(handgrading_rubric.show_grades_and_rubric_to_students).toEqual(false);

        let change_handgrading_rubric = `
from autograder.handgrading.models import HandgradingRubric

handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
handgrading_rubric.validate_and_update(show_grades_and_rubric_to_students=True)
        `;
        run_in_django_shell(change_handgrading_rubric);

        await handgrading_rubric.refresh();

        expect(handgrading_rubric.show_grades_and_rubric_to_students).toEqual(true);
        expect_dates_not_equal(handgrading_rubric.last_modified, old_timestamp);

        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Refresh handgrading rubric on criteria and annotations change', async () => {
        let old_timestamp = handgrading_rubric.last_modified;
        await sleep(1);

        await handgrading_rubric.refresh();
        expect_dates_equal(handgrading_rubric.last_modified, old_timestamp);
        expect(handgrading_rubric.criteria).toEqual([]);
        expect(handgrading_rubric.annotations).toEqual([]);

        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        // Create criterion and annotation (should change handgrading rubric response)
        let criterion = await Criterion.create(handgrading_rubric.pk, new NewCriterionData({
            short_description: "short 1",
            long_description: "long 1",
            points: 20,
        }));

        let annotation = await Annotation.create(handgrading_rubric.pk, new NewAnnotationData({
            short_description: "short 2",
            long_description: "long 2",
            deduction: -40,
        }));

        // Last modified doesn't change, but criteria and annotation does
        await handgrading_rubric.refresh();
        expect_dates_equal(handgrading_rubric.last_modified, old_timestamp);
        expect(handgrading_rubric.criteria).toEqual([criterion]);
        expect(handgrading_rubric.annotations).toEqual([annotation]);

        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);  // Observer isn't notified of this change
        expect(observer.deleted_count).toEqual(0);
    });

    test('Delete handgrading rubric', async () => {
        await project.refresh();
        expect(project.has_handgrading_rubric).toEqual(true);

        await handgrading_rubric.delete();

        expect(observer.handgrading_rubric).toBeNull();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(1);

        await project.refresh();
        expect(project.has_handgrading_rubric).toEqual(false);
    });
});
