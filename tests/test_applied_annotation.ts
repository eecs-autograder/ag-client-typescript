import {
    Annotation,
    AppliedAnnotation, AppliedAnnotationObserver,
    Course,
    ExpectedStudentFile,
    Group,
    HandgradingResult,
    HandgradingRubric,
    Project
} from '..';

import {
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
} from './utils';

beforeAll(() => {
    global_setup();
});

let course!: Course;
let project!: Project;
let handgrading_rubric!: HandgradingRubric;
let handgrading_result!: HandgradingResult;
let annotation!: Annotation;

class TestObserver implements AppliedAnnotationObserver {
    applied_annotation: AppliedAnnotation | null = null;

    created_count = 0;
    deleted_count = 0;

    update_applied_annotation_created(applied_annotation: AppliedAnnotation): void {
        this.created_count += 1;
        this.applied_annotation = applied_annotation;
    }

    update_applied_annotation_deleted(applied_annotation: AppliedAnnotation): void {
        this.deleted_count += 1;
        this.applied_annotation = null;
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
`;
    run_in_django_shell(create_submission);

    annotation = await Annotation.create(handgrading_rubric.pk, {});
    handgrading_result = await HandgradingResult.get_or_create(group.pk);

    observer = new TestObserver();
    AppliedAnnotation.subscribe(observer);
});

afterEach(() => {
    AppliedAnnotation.unsubscribe(observer);
});

describe('List/create applied annotation result tests', () => {
    test('Annotation result ctor', () => {
        let now = (new Date()).toISOString();
        let expected_student_file = new AppliedAnnotation({
            pk: 6,
            last_modified: now,
            location: {
                first_line: 1,
                last_line: 2,
                filename: "f1.txt",
            },
            annotation: annotation,
            handgrading_result: handgrading_result.pk,
        });

        expect(expected_student_file.pk).toEqual(6);
        expect(expected_student_file.last_modified).toEqual(now);
        expect(expected_student_file.location).toEqual({
            first_line: 1,
            last_line: 2,
            filename: "f1.txt",
        });
        expect(expected_student_file.annotation).toEqual(annotation);
        expect(expected_student_file.handgrading_result).toEqual(handgrading_result.pk);
    });

    test('List applied annotation result', async () => {
        let create_applied_annotation = `
from autograder.handgrading.models import (
    HandgradingResult, AppliedAnnotation, Annotation, HandgradingRubric
)
rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
result = HandgradingResult.objects.get(pk=${handgrading_result.pk})

a1 = Annotation.objects.validate_and_create(handgrading_rubric=rubric)
a2 = Annotation.objects.validate_and_create(handgrading_rubric=rubric)
l1 = {'filename': 'f1.txt', 'first_line': 0, 'last_line': 1}
l2 = {'filename': 'f1.txt', 'first_line': 1, 'last_line': 1}

AppliedAnnotation.objects.validate_and_create(handgrading_result=result, location=l1,
    annotation=a1)
AppliedAnnotation.objects.validate_and_create(handgrading_result=result, location=l2,
    annotation=a2)
        `;
        run_in_django_shell(create_applied_annotation);

        let loaded_applied_annotation = await AppliedAnnotation.get_all_from_handgrading_result(
            handgrading_result.pk);

        expect(loaded_applied_annotation.length).toEqual(2);
        let actual_selected = loaded_applied_annotation.map(
            (applied_annotation) => applied_annotation.location.first_line);
        expect(actual_selected).toEqual([0, 1]);
    });

    test('Create applied annotation result', async () => {
        let created = await AppliedAnnotation.create(
            handgrading_result.pk, {
                annotation: annotation.pk,
                location: {
                    filename: "f1.txt",
                    first_line: 0,
                    last_line: 1
                }
            }
        );

        let loaded = await AppliedAnnotation.get_all_from_handgrading_result(handgrading_result.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.annotation).toEqual(annotation);
        expect(actual.location.filename).toEqual("f1.txt");
        expect(actual.location.first_line).toEqual(0);
        expect(actual.location.last_line).toEqual(1);

        expect(observer.applied_annotation).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let applied_annotation = await AppliedAnnotation.create(
            handgrading_result.pk, {
                annotation: annotation.pk,
                location: {
                    filename: "f1.txt",
                    first_line: 0,
                    last_line: 1
                }
            }
        );

        expect(observer.applied_annotation).toEqual(applied_annotation);
        expect(observer.created_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);

        AppliedAnnotation.unsubscribe(observer);
        await applied_annotation.delete();

        expect(observer.created_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });
});

describe('Get/delete applied annotation tests', () => {
    let applied_annotation!: AppliedAnnotation;

    beforeEach(async () => {
        applied_annotation = await AppliedAnnotation.create(
            handgrading_result.pk, {
                annotation: annotation.pk,
                location: {
                    filename: "f1.txt",
                    first_line: 0,
                    last_line: 1
                }
            }
        );
    });

    test('Get applied annotation', async () => {
        let loaded = await AppliedAnnotation.get_by_pk(applied_annotation.pk);
        expect(loaded).toEqual(applied_annotation);
    });

    test('Delete applied annotation', async () => {
        await applied_annotation.delete();

        expect(observer.applied_annotation).toBeNull();
        expect(observer.created_count).toEqual(1);
        expect(observer.deleted_count).toEqual(1);

        let loaded_list = await AppliedAnnotation.get_all_from_handgrading_result(
            handgrading_result.pk);
        expect(loaded_list.length).toEqual(0);
    });
});
