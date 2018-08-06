import { Course, Semester, UnsavedCourse } from 'src/course';

import { global_setup, reset_db, run_in_django_shell } from './setup';

beforeAll(() => {
    global_setup();
});

describe('Course ctor tests', () => {
    test('Construct unsaved course', async () => {
        let course = new UnsavedCourse({});
        expect(course.name).toBe('Coursey');
        expect(course.semester).toBe(null);
        expect(course.year).toBe(null);
        expect(course.subtitle).toBe('');
        expect(course.num_late_days).toBe(0);
    });

    test('Construct course defaults', async () => {
        let now = (new Date()).toISOString();
        let course = new Course({
            pk: 44,
            name: 'New Course',
            semester: Semester.summer,
            year: 2017,
            subtitle: 'FUN!',
            num_late_days: 2,
            last_modified: now
        });
        expect(course.pk).toBe(44);
        expect(course.name).toBe('New Course');
        expect(course.semester).toBe(Semester.summer);
        expect(course.year).toBe(2017);
        expect(course.subtitle).toBe('FUN!');
        expect(course.num_late_days).toBe(2);
        expect(course.last_modified).toBe(now);
    });
});

describe('Get Course tests', () => {
    beforeEach(() => {
        reset_db();
    });

    test('Get course by fields', async () => {
        let create_course = `
from autograder.core.models import Course, Semester
Course.objects.validate_and_create(name='Course', semester=Semester.spring, year=2019,
                                   subtitle='Spam', num_late_days=2)
        `;
        run_in_django_shell(create_course);

        let course = await Course.get_by_fields('Course', Semester.spring, 2019);
        expect(course.name).toBe('Course');
        expect(course.semester).toBe(Semester.spring);
        expect(course.year).toBe(2019);
        expect(course.subtitle).toBe('Spam');
        expect(course.num_late_days).toBe(2);
    });

    test.only('get course by fields not found', async () => {
        return expect(
            Course.get_by_fields('Nope', Semester.fall, 2020)
        ).rejects.toHaveProperty('response.status', 404);
    });

    test('Get course by pk', async () => {
        let create_course = `
from autograder.core.models import Course, Semester
Course.objects.validate_and_create(name='Course', semester=Semester.spring, year=2019,
                                   subtitle='Spam', num_late_days=2)
        `;
        run_in_django_shell(create_course);

        let course = await Course.get_by_fields('Course', Semester.spring, 2019);
        expect(course.name).toBe('Course');
        expect(course.semester).toBe(Semester.spring);
        expect(course.year).toBe(2019);
        expect(course.subtitle).toBe('Spam');
        expect(course.num_late_days).toBe(2);
        fail();
    });

    test('Get course by pk not found', async () => {
        return expect(
            Course.get_by_pk(10000)
        ).rejects.toHaveProperty('response.status', 404);
    });
});

describe('List/create/save Course tests', () => {
    test('Get all courses', async () => {
        fail();
    });

    test('Get all courses none exist', async () => {
        fail();
    });


    test('Create course', async () => {
        fail();
    });


    test('Save course', async () => {
        fail();
    });

    test('Refresh course', async () => {
        fail();
    });
});
