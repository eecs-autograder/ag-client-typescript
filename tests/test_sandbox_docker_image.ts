import * as child_process from 'child_process';
import { writeFileSync } from 'fs';

import { BuildImageStatus, BuildSandboxDockerImageTask, Course, HttpError, SandboxDockerImage } from '..';

import {
    blob_to_buffer,
    blob_to_string,
    do_editable_fields_test,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
} from './utils';

beforeAll(() => {
    global_setup();
});

beforeEach(() => {
    reset_db();
    make_superuser();
});


test('SandboxDockerImage ctor', () => {
    let now = (new Date()).toISOString();
    let image = new SandboxDockerImage({
        pk: 12,
        display_name: 'Some image',
        course: null,
        last_modified: now,
    });
    expect(image.pk).toEqual(12);
    expect(image.display_name).toEqual('Some image');
    expect(image.course).toBeNull();
    expect(image.last_modified).toEqual(now);
});

describe('Global SandboxDockerImage tests', () => {
    test('List images', async () => {
        let make_images = `
from autograder.core.models import SandboxDockerImage

SandboxDockerImage.objects.validate_and_create(
    tag='image1:1',
    display_name='Image 1',
)

SandboxDockerImage.objects.validate_and_create(
    tag='image2:1',
    display_name='Image 3',
)

SandboxDockerImage.objects.validate_and_create(
    tag='image3:1',
    display_name='Image 2',
)
    `;
        run_in_django_shell(make_images);

        let images = await SandboxDockerImage.get_images(null);
        expect(images.map(item => item.display_name)).toEqual([
            'Default', 'Image 1', 'Image 2', 'Image 3',
        ]);
        expect(images.every(item => item.course === null));
    });

    test('Create image', async () => {
        let task = await SandboxDockerImage.create_image(
            [new File(['noseta'], 'Dockerfile')], null);
        expect(task.status).toEqual(BuildImageStatus.queued);
        expect(task.course_id).toBeNull();
        expect(task.image).toBeNull();
    });
});

describe('Course SandboxDockerImage tests', () => {
    let course: Course;

    beforeEach(async () => {
        course = await Course.create({name: 'An course'});
    });

    test('List images', async () => {
        let make_images = `
from autograder.core.models import SandboxDockerImage

SandboxDockerImage.objects.validate_and_create(
    tag='image1:1',
    display_name='Image 1',
    course=${course.pk}
)

SandboxDockerImage.objects.validate_and_create(
    tag='image2:1',
    display_name='Image 3',
    course=${course.pk}
)

SandboxDockerImage.objects.validate_and_create(
    tag='image3:1',
    display_name='Image 2',
    course=${course.pk}
)
    `;
        run_in_django_shell(make_images);

        let images = await SandboxDockerImage.get_images(course.pk);
        expect(images.map(item => item.display_name)).toEqual([
            'Image 1', 'Image 2', 'Image 3',
        ]);
        expect(images.every(item => item.course === course.pk));
    });

    test('Create image', async () => {
        let task = await SandboxDockerImage.create_image(
            [new File(['tarsioen'], 'Dockerfile')], course.pk);
        expect(task.status).toEqual(BuildImageStatus.queued);
        expect(task.course_id).toEqual(course.pk);
        expect(task.image).toBeNull();
    });
});

describe('SandboxDockerImage detail tests', () => {
    let image_name = 'My image';

    beforeEach(() => {
        let make_image = `
from autograder.core.models import SandboxDockerImage

SandboxDockerImage.objects.validate_and_create(
    tag='image1:1',
    display_name='${image_name}',
)
    `;
        run_in_django_shell(make_image);
    });

    test('Get image', async () => {
        let images = await SandboxDockerImage.get_images(null);
        let retrieved = await SandboxDockerImage.get_by_pk(images[1].pk);
        expect(retrieved).toEqual(images[1]);
    });

    test('Save image', async () => {
        let image = (await SandboxDockerImage.get_images(null))[1];
        expect(image.display_name).toEqual(image_name);

        let new_name = 'noiresatn';
        image.display_name = new_name;
        await image.save();

        let loaded = await SandboxDockerImage.get_by_pk(image.pk);
        expect(loaded.display_name).toEqual(new_name);
    });

    test('Delete image', async () => {
        let image = (await SandboxDockerImage.get_images(null))[1];
        expect(image.display_name).toEqual(image_name);
        await image.delete();

        try {
            await SandboxDockerImage.get_by_pk(image.pk);
            fail('Exception not thrown');
        }
        catch (e) {
            expect(e instanceof HttpError).toBe(true);
            expect((<HttpError> e).status).toEqual(404);
        }
    });

    test('Rebuild global image', async () => {
        let image = (await SandboxDockerImage.get_images(null))[1];
        let task = await image.rebuild([new File(['noseta'], 'Dockerfile')]);
        expect(task.status).toEqual(BuildImageStatus.queued);
        expect(task.course_id).toBeNull();
        expect(task.image).toEqual(image);
    });

    test('Rebuild course image', async () => {
        let course = await Course.create({name: 'Courseo'});

        let make_image = `
from autograder.core.models import SandboxDockerImage

SandboxDockerImage.objects.validate_and_create(
    tag='image1:1',
    display_name='${image_name}',
    course=${course.pk}
)
    `;
        run_in_django_shell(make_image);

        let image = (await SandboxDockerImage.get_images(course.pk))[0];
        let task = await image.rebuild([new File(['noseta'], 'Dockerfile')]);
        expect(task.status).toEqual(BuildImageStatus.queued);
        expect(task.course_id).toEqual(course.pk);
        expect(task.image).toEqual(image);
    });

    test('Check editable fields', async () => {
        do_editable_fields_test(SandboxDockerImage, 'SandboxDockerImage');
    });
});

test('BuildSandboxDockerImageTask ctor', () => {
    let task = new BuildSandboxDockerImageTask({
        pk: 89,
        created_at: (new Date()).toISOString(),
        status: BuildImageStatus.image_invalid,
        return_code: null,
        timed_out: true,
        filenames: ['Dockerfile', 'file1'],
        course_id: 23,
        image: null,
        validation_error_msg: '',
        internal_error_msg: '',
    });
    expect(task.pk).toEqual(89);
    expect(task.status).toEqual(BuildImageStatus.image_invalid);
    expect(task.return_code).toBeNull();
    expect(task.timed_out).toBe(true);
    expect(task.filenames).toEqual(['Dockerfile', 'file1']);
    expect(task.course_id).toEqual(23);
    expect(task.image).toBeNull();
});

describe('Global BuildSandboxDockerImageTask tests', () => {
    test('List build tasks', async () => {
        let task1 = await SandboxDockerImage.create_image(
            [new File([''], 'Dockerfile'), new File([''], 'file1.txt')], null
        );
        let task2 = await SandboxDockerImage.create_image(
            [new File([''], 'file3.txt'), new File([''], 'Dockerfile')], null
        );
        let task3 = await SandboxDockerImage.create_image(
            [new File([''], 'Dockerfile')], null
        );

        let loaded = await BuildSandboxDockerImageTask.get_build_tasks(null);
        expect(loaded).toEqual([task3, task2, task1]);
    });
});

describe('Course BuildSandboxDockerImageTask tests', () => {
    test('List build tasks', async () => {
        let course = await Course.create({name: 'Cours'});
        let task1 = await SandboxDockerImage.create_image(
            [new File([''], 'Dockerfile')], course.pk
        );
        let task2 = await SandboxDockerImage.create_image(
            [new File([''], 'file2.txt'), new File([''], 'Dockerfile')], course.pk
        );
        let task3 = await SandboxDockerImage.create_image(
            [new File([''], 'Dockerfile'), new File([''], 'file4.txt')], course.pk
        );

        let loaded = await BuildSandboxDockerImageTask.get_build_tasks(course.pk);
        expect(loaded).toEqual([task3, task2, task1]);
    });
});

describe('BuildSandboxDockerImageTask detail tests', () => {
    test('Get build task', async () => {
        let task = await SandboxDockerImage.create_image(
            [new File([''], 'Dockerfile')], null
        );

        let loaded = await BuildSandboxDockerImageTask.get_by_pk(task.pk);
        expect(loaded).toEqual(task);
    });

    test('Get build task output', async () => {
        let output = 'qwounvoiufatnoe,vmniofatnouravnixceavnoirsultn';
        let task = await SandboxDockerImage.create_image(
            [new File([''], 'Dockerfile')], null
        );

        let set_output = `
from autograder.core.models import BuildSandboxDockerImageTask

task = BuildSandboxDockerImageTask.objects.get(pk=${task.pk})
with open(task.output_filename, 'w') as f:
    f.write('${output}')
        `;
        run_in_django_shell(set_output);

        let loaded_output = await task.get_output();
        expect(await blob_to_string(loaded_output)).toEqual(output);
    });

    test('Get build task files', async () => {
        let task = await SandboxDockerImage.create_image(
            [new File([''], 'Dockerfile'), new File([''], 'file2')], null
        );

        let files_zip = await task.get_files();
        let filename = `/tmp/build_task_files${Math.floor(Math.random() * 1000)}`;

        writeFileSync(filename, await blob_to_buffer(files_zip));

        let result = child_process.spawnSync(`unzip -Z1 ${filename}`, {shell: true});
        let stdout = result.stdout.toString();
        expect(stdout).toEqual('Dockerfile\nfile2\n');
    });

    test('Cancel build task', async () => {
        let task = await SandboxDockerImage.create_image(
            [new File([''], 'Dockerfile')], null
        );
        expect(task.status).toEqual(BuildImageStatus.queued);

        await task.cancel();
        expect(task.status).toEqual(BuildImageStatus.cancelled);

        let loaded = await BuildSandboxDockerImageTask.get_by_pk(task.pk);
        expect(loaded.status).toEqual(BuildImageStatus.cancelled);
    });
});
